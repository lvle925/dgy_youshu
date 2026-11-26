import { ActionButton } from "@/app/AccessContext";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { DataTable, type DataColumn } from "@/../src/components/shared/DataTable";
import { DetailFields } from "@/../src/components/shared/DetailFields";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { StatusTag } from "@/../src/components/shared/StatusTag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, Plus, ShieldAlert } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useReportExport } from "@/app/ReportQueue";
import { FormDialog, FormField, NativeSelect, PageHeading, PageSection, SearchField } from "@/pages/PagePrimitives";

type Row = Record<string, any> & { id: string | number };
const emptyRequests: Row[] = [];

function isOverdue(row: Partial<Row>) {
  return row.status !== "已办结" && Boolean(row.dueAt) && String(row.dueAt) < new Date().toISOString().slice(0, 10);
}

export function GuaranteePage() {
  const data = useBusinessCollection<Row>({ key: "youshu-service-requests", seed: emptyRequests, apiCollection: "serviceRequests" });
  const enqueue = useReportExport();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [park, setPark] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [assigning, setAssigning] = useState<Row | null>(null);
  const [assign, setAssign] = useState({ departmentId: "", owner: "", dueAt: "" });
  const [form, setForm] = useState({ name: "", title: "", category: "政策服务", park: "", parkId: "", priority: "普通", dueAt: "", description: "" });
  const overdueCount = data.rows.filter(isOverdue).length;
  const filtered = data.rows.filter((row) => (!keyword || `${row.name} ${row.title} ${row.company}`.includes(keyword)) && (!status || (status === "超期督办" ? isOverdue(row) : row.status === status)) && (!park || row.park === park));
  const statusOptions = ["待派单", "办理中", "已办结", "超期督办"];
  const columns: DataColumn<Row>[] = [
    { key: "name", header: "诉求企业", sortable: true },
    { key: "title", header: "企业诉求", sortable: true },
    { key: "category", header: "事项类别" },
    { key: "park", header: "所属园区" },
    { key: "owner", header: "承办人员", cell: (row) => row.owner || "待派单" },
    { key: "dueAt", header: "办理期限", sortable: true },
    { key: "supervision", header: "督办状态", cell: (row) => isOverdue(row) ? <StatusTag value="超期督办" tone="danger" /> : row.status === "已办结" ? <StatusTag value="已办结" tone="success" /> : <StatusTag value={row.priority === "督办" ? "重点督办" : "按期办理"} tone={row.priority === "督办" ? "warning" : "neutral"} /> },
    { key: "status", header: "办理状态", cell: (row) => <StatusTag value={row.status} tone={row.status === "已办结" ? "success" : isOverdue(row) ? "danger" : row.status === "办理中" ? "warning" : "neutral"} /> },
    { key: "action", header: "操作", cell: (row) => <div className="table-action-buttons">
      {row.status === "待派单" && <ActionButton action="编辑" size="sm" onClick={() => { setAssigning(row); setAssign({ departmentId: row.departmentId || "", owner: row.owner || "", dueAt: row.dueAt || "" }); }}>派单</ActionButton>}
      {row.status === "办理中" && <ActionButton action="编辑" size="sm" variant="outline" onClick={() => navigate("/myCampus/visitManage/index", { state: { company: row.name || row.company, serviceRequestId: row.id, park: row.park, parkId: row.parkId, departmentId: row.departmentId } })}>创建走访</ActionButton>}
    </div> },
  ];

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !form.title.trim() || !form.dueAt) return toast.warning("请填写企业、诉求内容和办理期限");
    try {
      const row = await data.createRecord({ ...form, company: form.name, status: "待派单", createdAt: new Date().toISOString().slice(0, 10), source: "企业诉求受理" } as Omit<Row, "id">);
      setCreateOpen(false);
      setForm({ ...form, name: "", title: "", dueAt: "", description: "" });
      toast.success(`已受理企业诉求 ${row.id}`);
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "诉求受理失败"); }
  }

  async function assignRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assigning || !assign.departmentId.trim() || !assign.owner.trim()) return toast.warning("请选择承办部门并填写执行人");
    try {
      await data.updateRecord(assigning.id, { departmentId: assign.departmentId.trim(), owner: assign.owner.trim(), dueAt: assign.dueAt || assigning.dueAt, assignedAt: new Date().toISOString(), status: "办理中" });
      setAssigning(null);
      toast.success("诉求已派单至承办部门");
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "派单失败"); }
  }

  async function exportRequests() {
    enqueue("企业诉求与督办台账.csv", [
      { header: "企业", value: (row) => row.name || row.company }, { header: "诉求", value: (row) => row.title },
      { header: "承办部门", value: (row) => row.departmentId }, { header: "承办人", value: (row) => row.owner },
      { header: "办理期限", value: (row) => row.dueAt }, { header: "状态", value: (row) => isOverdue(row) ? "超期督办" : row.status },
    ], filtered);
  }

  const parks = useMemo(() => [...new Set(data.rows.map((row) => String(row.park ?? "")).filter(Boolean))], [data.rows]);
  return <div className="business-page">
    <PageHeading title="企服保障" description="企业诉求受理、部门派单、走访反馈和办结督办闭环" source={data.source} actions={<>
      <ActionButton action="导出" variant="outline" onClick={() => void exportRequests()}>导出诉求台账</ActionButton>
      <ActionButton action="新增" onClick={() => setCreateOpen(true)}><Plus data-icon="inline-start" />受理企业诉求</ActionButton>
    </>} />
    <div className="business-metric-grid">
      <MetricCard title="在办诉求" value={data.rows.filter((row) => row.status !== "已办结").length} description="待派单与办理中" icon={<ClipboardCheck />} />
      <MetricCard title="待派单" value={data.rows.filter((row) => row.status === "待派单").length} description="等待部门承办" />
      <MetricCard title="已办结" value={data.rows.filter((row) => row.status === "已办结").length} description="已完成走访与反馈" />
      <MetricCard title="超期督办" value={overdueCount} description="按办理期限自动识别" icon={<ShieldAlert />} />
    </div>
    <PageSection title="诉求办理台账" description={`筛选结果 ${filtered.length} 项`}>
      <div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="企业、诉求或事项类别" /><NativeSelect label="办理状态" value={status} onChange={setStatus} options={statusOptions} /><NativeSelect label="所属园区" value={park} onChange={setPark} options={parks} /></div>
      <DataTable columns={columns} data={filtered} openRowDetails={false} onRowClick={setSelected} detailTitle="企业诉求详情" />
    </PageSection>
    <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><SheetContent side="right" className="business-detail-sheet"><SheetHeader><SheetTitle>{selected?.title}</SheetTitle><SheetDescription>{selected?.name} · {isOverdue(selected ?? {}) ? "超期督办" : selected?.status}</SheetDescription></SheetHeader>{selected && <><DetailFields row={selected} exclude={["description"]} /><p className="business-detail-prose">{selected.description}</p>{selected.status === "办理中" && <Button onClick={() => navigate("/myCampus/visitManage/index", { state: { company: selected.name || selected.company, serviceRequestId: selected.id, park: selected.park, parkId: selected.parkId, departmentId: selected.departmentId } })}>派生走访工单</Button>}</>}</SheetContent></Sheet>
    <FormDialog open={createOpen} onOpenChange={setCreateOpen} title="受理企业诉求" description="提交后进入部门派单队列，完整过程将写入审计记录" onSubmit={createRequest}>
      <FormField label="企业名称" required><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></FormField>
      <FormField label="诉求事项" required><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></FormField>
      <FormField label="事项类别"><NativeSelect bare label="事项类别" allowEmpty={false} value={form.category} onChange={(value) => setForm({ ...form, category: value })} options={["政策服务", "人才服务", "载体保障", "用工服务", "融资服务", "其他诉求"]} /></FormField>
      <FormField label="所属园区"><NativeSelect bare label="所属园区" allowEmpty={false} value={form.park || parks[0] || ""} onChange={(value) => setForm({ ...form, park: value, parkId: value })} options={parks.length ? parks : ["未指定园区"]} /></FormField>
      <FormField label="办理期限" required><Input type="date" value={form.dueAt} onChange={(event) => setForm({ ...form, dueAt: event.target.value })} required /></FormField>
      <FormField label="优先级"><NativeSelect bare label="优先级" allowEmpty={false} value={form.priority} onChange={(value) => setForm({ ...form, priority: value })} options={["普通", "督办"]} /></FormField>
      <FormField label="诉求说明"><Input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></FormField>
    </FormDialog>
    <FormDialog open={Boolean(assigning)} onOpenChange={(open) => !open && setAssigning(null)} title="派单至承办部门" description={assigning?.title} onSubmit={assignRequest}>
      <FormField label="承办部门" required><Input value={assign.departmentId} onChange={(event) => setAssign({ ...assign, departmentId: event.target.value })} required placeholder="例如 企业服务处" /></FormField>
      <FormField label="承办人员" required><Input value={assign.owner} onChange={(event) => setAssign({ ...assign, owner: event.target.value })} required /></FormField>
      <FormField label="办理期限"><Input type="date" value={assign.dueAt} onChange={(event) => setAssign({ ...assign, dueAt: event.target.value })} /></FormField>
    </FormDialog>
  </div>;
}
