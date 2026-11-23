import { ActionButton } from "@/app/AccessContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { FormDialog, FormField, PageHeading, PageSection, SearchField, StatusValue } from "@/pages/PagePrimitives";
import { DataTable, type DataColumn } from "@/../src/components/shared/DataTable";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { Building2, ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

type Department = Record<string, any> & { id: string | number; parentId?: string };

const emptyDepartments: Department[] = [];

export function DepartmentPage() {
  const data = useBusinessCollection<Department>({ key: "youshu-departments", seed: emptyDepartments, apiCollection: "departments" });
  const [keyword, setKeyword] = useState("");
  const [editing, setEditing] = useState<Department | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: "", parentId: "", type: "业务处室", leader: "", status: "启用" });
  const query = keyword.trim();
  const visibleIds = useMemo(() => {
    if (!query) return new Set(data.rows.map((row) => String(row.id)));
    const byId = new Map(data.rows.map((row) => [String(row.id), row]));
    const visible = new Set<string>();
    for (const row of data.rows) {
      if (`${row.name} ${row.type} ${row.leader}`.includes(query)) {
        visible.add(String(row.id));
        let parent = byId.get(String(row.parentId ?? ""));
        while (parent) {
          visible.add(String(parent.id));
          parent = byId.get(String(parent.parentId ?? ""));
        }
      }
    }
    return visible;
  }, [data.rows, query]);
  const columns: DataColumn<Department>[] = [
    { key: "name", header: "部门名称", sortable: true },
    { key: "type", header: "组织类型" },
    { key: "leader", header: "负责人" },
    { key: "members", header: "绑定人员", cell: (row) => data.rows.reduce((count, item) => count + (String(item.departmentId ?? "") === String(row.id) ? 1 : 0), 0) },
    { key: "status", header: "状态", cell: (row) => <StatusValue value={row.status} /> },
    { key: "action", header: "操作", cell: (row) => <div className="table-action-buttons"><ActionButton action="编辑" size="sm" variant="ghost" onClick={() => openEditor(row)}><Pencil data-icon="inline-start" />编辑</ActionButton><ActionButton action="删除" size="sm" variant="ghost" onClick={() => void remove(row)}><Trash2 data-icon="inline-start" />删除</ActionButton></div> },
  ];

  const tree = data.rows.filter((row) => !row.parentId || !data.rows.some((parent) => String(parent.id) === String(row.parentId)))
    .map((row) => ({ ...row, parentId: "" }));

  function openEditor(row?: Department) {
    setEditing(row ?? null);
    setForm(row ? {
      name: row.name,
      parentId: String(row.parentId ?? ""),
      type: row.type ?? "业务处室",
      leader: row.leader ?? "",
      status: row.status ?? "启用",
    } : { name: "", parentId: "", type: "业务处室", leader: "", status: "启用" });
    setFormOpen(true);
  }

  async function saveDepartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) return toast.warning("请填写组织名称");
    if (editing && (String(editing.id) === form.parentId || descendants(String(editing.id)).has(form.parentId)))
      return toast.warning("上级组织不能设置为当前部门或下级部门");
    const row = { ...form, name: form.name.trim(), parentId: form.parentId };
    try {
      if (editing) await data.updateRecord(editing.id, row);
      else await data.createRecord(row as Omit<Department, "id">);
      setFormOpen(false);
      toast.success(editing ? "组织信息已更新" : "组织架构已新增");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "组织信息保存失败");
    }
  }

  function descendants(id: string) {
    const result = new Set<string>();
    const queue = [id];
    while (queue.length) {
      const current = queue.shift()!;
      data.rows.filter((row) => String(row.parentId ?? "") === current).forEach((row) => {
        const childId = String(row.id);
        if (!result.has(childId)) { result.add(childId); queue.push(childId); }
      });
    }
    return result;
  }

  async function remove(row: Department) {
    if (data.rows.some((item) => String(item.parentId ?? "") === String(row.id))) return toast.warning("请先调整下级部门的隶属关系");
    try {
      await data.removeRecord(row.id);
      toast.success("组织节点已删除");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "删除失败");
    }
  }

  function renderTree(rows: Department[], parentId = "", depth = 0): ReactNode {
    return rows.filter((row) => String(row.parentId ?? "") === parentId && visibleIds.has(String(row.id)))
      .map((row) => {
        const children = data.rows.filter((child) => String(child.parentId ?? "") === String(row.id));
        return <DepartmentTreeNode key={row.id} row={row} depth={depth} hasChildren={children.length > 0} onEdit={() => openEditor(row)}>
          {renderTree(data.rows, String(row.id), depth + 1)}
        </DepartmentTreeNode>;
      });
  }

  return <div className="business-page">
    <PageHeading title="部门与组织架构" description="维护委办局、招商处室、园区工作组和人员归属关系" source={data.source} actions={<ActionButton action="新增" onClick={() => openEditor()}><Plus data-icon="inline-start" />新增组织</ActionButton>} />
    <div className="business-metric-grid"><MetricCard title="组织节点" value={data.rows.length} description="委办局与园区工作组" icon={<Building2 />} /><MetricCard title="启用部门" value={data.rows.filter((row) => row.status === "启用").length} description="可绑定工作台成员" /><MetricCard title="组织层级" value={treeDepth(data.rows)} description="从上级单位到工作组" /></div>
    <div className="department-layout">
      <PageSection title="组织树" description="选择组织节点后可维护负责人和上级隶属关系">
        <SearchField value={keyword} onChange={setKeyword} placeholder="搜索组织、类型或负责人" />
        <div className="department-tree">{tree.length ? renderTree(tree) : <p className="text-muted-foreground">暂无组织节点</p>}</div>
      </PageSection>
      <PageSection title="组织清单" description={`共 ${data.rows.length} 个组织节点`}>
        <DataTable columns={columns} data={data.rows.filter((row) => visibleIds.has(String(row.id)))} openRowDetails={false} />
      </PageSection>
    </div>
    <FormDialog open={formOpen} onOpenChange={setFormOpen} title={editing ? "编辑组织节点" : "新增组织节点"} description="成员的部门归属与数据范围授权由安全保密员维护" onSubmit={saveDepartment}>
      <FormField label="组织名称" required><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></FormField>
      <FormField label="上级组织"><select className="business-input" value={form.parentId} onChange={(event) => setForm({ ...form, parentId: event.target.value })}><option value="">作为根组织</option>{data.rows.filter((row) => String(row.id) !== String(editing?.id ?? "") && !descendants(String(editing?.id ?? "")).has(String(row.id))).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></FormField>
      <FormField label="组织类型"><select className="business-input" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>{["委办局", "业务处室", "园区管委会", "园区工作组", "招商小组"].map((type) => <option key={type}>{type}</option>)}</select></FormField>
      <FormField label="负责人"><Input value={form.leader} onChange={(event) => setForm({ ...form, leader: event.target.value })} /></FormField>
      <FormField label="状态"><select className="business-input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>启用</option><option>停用</option></select></FormField>
    </FormDialog>
  </div>;
}

function DepartmentTreeNode({ row, depth, hasChildren, onEdit, children }: { row: Department; depth: number; hasChildren: boolean; onEdit: () => void; children: ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  return <div className="department-tree-node">
    <div className="department-tree-row" style={{ paddingLeft: `${depth * 18}px` }}>
      <button type="button" aria-label={`${expanded ? "收起" : "展开"}${row.name}`} disabled={!hasChildren} onClick={() => setExpanded(!expanded)}>{hasChildren ? expanded ? <ChevronDown /> : <ChevronRight /> : <Building2 />}</button>
      <div><strong>{row.name}</strong><small>{row.type} · {row.leader || "未指定负责人"}</small></div>
      <Button variant="ghost" size="icon" aria-label={`编辑${row.name}`} onClick={onEdit}><Pencil /></Button>
    </div>
    {expanded && children}
  </div>;
}

function treeDepth(rows: Department[], parentId = ""): number {
  const children = rows.filter((row) => String(row.parentId ?? "") === parentId);
  if (!children.length) return 0;
  return 1 + Math.max(...children.map((row) => treeDepth(rows, String(row.id))));
}
