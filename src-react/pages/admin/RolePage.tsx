import { ActionButton, useAllowedAction } from "@/app/AccessContext";
import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type DataColumn } from "@/../src/components/shared/DataTable";
import { PermissionTree, type PermissionNode } from "@/../src/components/shared/PermissionTree";
import { members, roles } from "../../../src/data/mock.js";
import { navigationGroups } from "@/app/navigation";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { FormDialog, FormField, PageHeading, PageSection, SearchField, StatusValue } from "@/pages/PagePrimitives";

type Row = Record<string, any> & { id: string | number };

const permissionNodes: PermissionNode[] = navigationGroups.map((group) => ({
  id: `menu:${group.title}`,
  label: group.title,
  children: [
    ...group.sections.flatMap((section) => section.items.map((item) => ({ id: `route:${item.path}`, label: item.title }))),
    ...["新增", "编辑", "删除", "导出"].map((action) => ({ id: `button:${group.title}:${action}`, label: `${action}操作` })),
  ],
}));

function permissionsForRole(role: Row) {
  const saved = Array.isArray(role.permissions) ? role.permissions : [];
  if (Array.isArray(role.permissions)) return saved as string[];

  const labels = new Set(Array.isArray(role.perms) ? role.perms : []);
  if (labels.has("全部菜单")) {
    return permissionNodes.flatMap((group) => [group.id, ...(group.children ?? []).map((child) => child.id)]);
  }

  const selected: string[] = [];
  permissionNodes.forEach((group) => {
    const selectedChildren = (group.children ?? []).filter((child) =>
      labels.has(group.label) || labels.has(child.label) || (child.label === "人员管理" && labels.has("成员管理")) ||
      (labels.has("数据导出") && child.id.endsWith(":导出")) ||
      (labels.has("成员管理") && group.label === "平台管理" && /:(新增|编辑|删除)$/.test(child.id)),
    );
    if (selectedChildren.length) selected.push(group.id, ...selectedChildren.map((child) => child.id));
  });
  return selected;
}

function labelsForPermissions(selected: string[]) {
  const ids = new Set(selected);
  return permissionNodes.flatMap((group) => (group.children ?? [])
    .filter((child) => ids.has(child.id))
    .map((child) => child.label));
}

export function RolePage() {
  const data = useBusinessCollection<Row>({ key: "youshu-roles", seed: roles, apiCollection: "roles" });
  const canEdit = useAllowedAction("编辑");
  const [keyword, setKeyword] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", desc: "", status: "启用", perms: [] as string[] });
  const filtered = data.rows.filter((row) => !keyword || `${row.name} ${row.desc}`.includes(keyword));
  const columns: DataColumn<Row>[] = [{ key: "name", header: "角色名称", sortable: true }, { key: "code", header: "角色编码" }, { key: "desc", header: "角色说明" }, { key: "members", header: "绑定成员", sortable: true }, { key: "status", header: "状态", cell: (row) => <StatusValue value={row.status ?? "启用"} /> }, { key: "action", header: "操作", cell: (row) => <ActionButton action="编辑" size="sm" variant="outline" onClick={() => edit(row)}>配置权限</ActionButton> }];
  function edit(row?: Row) { setEditing(row ?? null); setForm(row ? { name: row.name, desc: row.desc, status: row.status ?? "启用", perms: permissionsForRole(row) } : { name: "", desc: "", status: "启用", perms: [] }); setOpen(true); }
  async function saveRole(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!form.name.trim()) return toast.warning("请输入角色名称"); const labels = labelsForPermissions(form.perms); try { if (editing) await data.updateRecord(editing.id, { ...editing, name: form.name, desc: form.desc, status: form.status, permissions: form.perms, perms: labels }); else await data.createRecord({ name: form.name, code: `role_${Date.now()}`, desc: form.desc, status: form.status, members: 0, perms: labels, permissions: form.perms } as Omit<Row, "id">); setOpen(false); toast.success("角色权限已保存"); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "角色保存失败"); } }
  return <div className="business-page"><PageHeading title="角色管理" description="按菜单与操作按钮配置角色权限范围" source={data.source} actions={<ActionButton action="新增" onClick={() => edit()}><Plus data-icon="inline-start" />新增角色</ActionButton>} /><PageSection title="角色列表" description={`共 ${filtered.length} 个角色`}><div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="搜索角色名称" /></div><DataTable columns={columns} data={filtered} openRowDetails={false} onRowClick={canEdit ? edit : undefined} detailTitle="角色配置" /></PageSection><FormDialog open={open} onOpenChange={setOpen} title={editing ? `编辑角色 · ${editing.name}` : "新增角色"} description="勾选子权限时会自动保留父级菜单权限" onSubmit={saveRole} width="max-w-4xl"><FormField label="角色名称" required><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></FormField><FormField label="角色状态"><select className="business-input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>启用</option><option>停用</option></select></FormField><FormField label="角色说明"><Input value={form.desc} onChange={(event) => setForm({ ...form, desc: event.target.value })} /></FormField><div className="role-tree-field"><span>权限配置</span><PermissionTree nodes={permissionNodes} value={form.perms} onChange={(perms) => setForm({ ...form, perms })} /></div></FormDialog></div>;
}
