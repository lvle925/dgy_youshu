import { useReportExport } from "@/app/ReportQueue";
import { ActionButton, usePrincipal } from "@/app/AccessContext";
import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { CalendarDays, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type DataColumn } from "@/../src/components/shared/DataTable";
import { DetailFields } from "@/../src/components/shared/DetailFields";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { platformUsers, visitOrders, visitRecords } from "../../../src/data/mock.js";
import { api } from "../../../src/api.js";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { FormDialog, FormField, NativeSelect, PageHeading, PageSection, SearchField, SectionTabs, StatusValue } from "@/pages/PagePrimitives";

type Row = Record<string, any> & { id: string | number };

const visitFieldLabels: Record<string, string> = { title: "工单主题", owner: "执行人", source: "触发来源" };

export function VisitManagePage() {
  const enqueue = useReportExport();
  const location = useLocation();
  const orders = useBusinessCollection<Row>({ key: "youshu-visit-orders", seed: visitOrders, apiCollection: "visitOrders" });
  const records = useBusinessCollection<Row>({ key: "youshu-visit-records", seed: visitRecords, apiCollection: "visitRecords" });
  const principal = usePrincipal();
  const [tab, setTab] = useState("orders");
  const [filters, setFilters] = useState<Record<"orders" | "records", { keyword: string; owner: string; status: string }>>({
    orders: { keyword: "", owner: "", status: "" },
    records: { keyword: "", owner: "", status: "" },
  });
  const current = filters[tab === "records" ? "records" : "orders"];
  const patchFilters = (patch: Partial<{ keyword: string; owner: string; status: string }>) => setFilters((state) => ({ ...state, [tab === "records" ? "records" : "orders"]: { ...state[tab === "records" ? "records" : "orders"], ...patch } }));
  const [createOpen, setCreateOpen] = useState(false);
  const [completeOrder, setCompleteOrder] = useState<Row | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [recordDetail, setRecordDetail] = useState<Row | null>(null);
  const requestedCompany = (location.state as { company?: string } | null)?.company;
  const requestedServiceRequestId = (location.state as { serviceRequestId?: string | number } | null)?.serviceRequestId;
  const requestedPark = (location.state as { park?: string; parkId?: string; departmentId?: string } | null)?.park ?? "";
  const requestedParkId = (location.state as { parkId?: string } | null)?.parkId ?? "";
  const requestedDepartmentId = (location.state as { departmentId?: string } | null)?.departmentId ?? "";
  const [form, setForm] = useState({ title: "", company: requestedCompany ?? "", source: requestedServiceRequestId ? "企业诉求" : requestedCompany ? "企业档案" : "手动创建", owner: principal?.displayName || String(platformUsers[0]), planDate: "", priority: "中", note: "", serviceRequestId: requestedServiceRequestId ?? "", park: requestedPark, parkId: requestedParkId, departmentId: requestedDepartmentId, ownerId: principal?.memberId || principal?.user || "", createdBy: principal?.user || "" });
  const [complete, setComplete] = useState({ result: "", duration: "45 分钟" });
  useEffect(() => {
    if (requestedCompany || requestedServiceRequestId || requestedPark) setCreateOpen(true);
  }, [requestedCompany, requestedServiceRequestId, requestedPark]);
  const rows = tab === "orders" ? orders.rows : records.rows;
  const filtered = rows.filter((row) => (!current.keyword || `${row.title} ${row.company ?? ""}`.includes(current.keyword)) && (!current.owner || row.owner === current.owner) && (!("status" in current) || !current.status || row.status === current.status));
  const orderColumns: DataColumn<Row>[] = [{ key: "title", header: "工单标题", sortable: true }, { key: "company", header: "关联企业" }, { key: "owner", header: "负责人" }, { key: "source", header: "触发来源" }, { key: "planDate", header: "计划日期", sortable: true }, { key: "priority", header: "优先级", cell: (row) => <StatusValue value={row.priority} /> }, { key: "status", header: "状态", cell: (row) => <StatusValue value={row.status} /> }, { key: "action", header: "操作", cell: (row) => row.status === "已完成" ? <Button size="sm" variant="outline" onClick={() => setDetail(row)}>查看</Button> : <ActionButton action="编辑" size="sm" variant="outline" onClick={() => { setCompleteOrder(row); setComplete({ result: "", duration: "45 分钟" }); }}>完成走访</ActionButton> }];
  const recordColumns: DataColumn<Row>[] = [{ key: "title", header: "走访主题", sortable: true }, { key: "company", header: "关联企业" }, { key: "owner", header: "走访人" }, { key: "date", header: "走访日期", sortable: true }, { key: "duration", header: "时长" }, { key: "result", header: "走访结果" }, { key: "action", header: "操作", cell: (row) => <Button size="sm" variant="outline" onClick={() => setRecordDetail(row)}>详情</Button> }];
  async function createOrder(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!form.title.trim()) return toast.warning("请填写工单标题"); try { await orders.createRecord({ ...form, creator: localStorage.getItem("DEMO_USER") || "本地管理员", status: "待走访", created: new Date().toISOString().slice(0, 10) } as Omit<Row, "id">); setCreateOpen(false); setForm({ ...form, title: "", company: "", planDate: "", note: "" }); toast.success("走访工单已创建"); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "工单创建失败"); } }
  async function completeVisit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!completeOrder || !complete.result.trim()) return toast.warning("请填写走访结果"); try { if (orders.source === "server" && records.source === "server") { const saved = await api.completeVisit(completeOrder.id, complete); orders.setRows((items) => items.map((row) => row.id === completeOrder.id ? saved.order : row)); records.setRows((items) => [saved.record, ...items]); } else { await orders.updateRecord(completeOrder.id, { status: "已完成" }); await records.createRecord({ title: completeOrder.title, company: completeOrder.company, owner: completeOrder.owner, date: new Date().toISOString().slice(0, 10), result: complete.result, duration: complete.duration } as Omit<Row, "id">); } setCompleteOrder(null); setDetail(null); toast.success("走访已完成，记录已归档"); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "完成走访失败"); } }
  return <div className="business-page"><PageHeading title="走访管理" description="将迁移预警、政策到期和企业服务需求转为走访工单与过程记录" source={orders.source} actions={tab === "orders" ? <ActionButton action="新增" onClick={() => setCreateOpen(true)}><Plus data-icon="inline-start" />新增工单</ActionButton> : <ActionButton action="导出" variant="outline" onClick={() => enqueue("走访记录.csv", [{ header: "标题", value: row => row.title }, { header: "企业", value: row => row.company }, { header: "负责人", value: row => row.owner }, { header: "走访日期", value: row => row.date }, { header: "结果", value: row => row.result }], filtered)}><Download data-icon="inline-start" />导出记录</ActionButton>} /><div className="business-metric-grid"><MetricCard title="待走访工单" value={orders.rows.filter((row) => row.status === "待走访").length} description="等待执行" icon={<CalendarDays />} /><MetricCard title="走访中" value={orders.rows.filter((row) => row.status === "走访中").length} description="正在服务企业" /><MetricCard title="本月完成" value={records.rows.length} description="已归档走访记录" /><MetricCard title="高优先级" value={orders.rows.filter((row) => row.priority === "高" && row.status !== "已完成").length} description="建议优先安排" /></div><PageSection title="走访工作台" description={`共 ${filtered.length} 条记录`}><SectionTabs items={[{ key: "orders", label: "走访工单", count: orders.rows.length }, { key: "records", label: "走访记录", count: records.rows.length }]} value={tab} onChange={(value) => setTab(value)} /><div className="business-toolbar"><SearchField value={current.keyword} onChange={(value) => patchFilters({ keyword: value })} placeholder={tab === "orders" ? "搜索工单或企业" : "搜索走访主题或企业"} /><NativeSelect label="负责人" value={current.owner} onChange={(value) => patchFilters({ owner: value })} options={[...new Set(rows.map((row) => row.owner))]} />{tab === "orders" && <NativeSelect label="工单状态" value={(current as { status?: string }).status ?? ""} onChange={(value) => patchFilters({ status: value })} options={["待走访", "走访中", "已完成", "已取消"]} />}</div><DataTable columns={tab === "orders" ? orderColumns : recordColumns} data={filtered} openRowDetails={false} onRowClick={tab === "orders" ? setDetail : setRecordDetail} detailTitle={tab === "orders" ? "走访工单" : "走访记录"} /></PageSection>
    <FormDialog open={createOpen} onOpenChange={setCreateOpen} title="新增走访工单" onSubmit={createOrder}><FormField label="工单主题" required><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></FormField><FormField label="关联企业"><Input value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} /></FormField><FormField label="触发来源"><NativeSelect bare label="触发来源" allowEmpty={false} value={form.source} onChange={(value) => setForm({ ...form, source: value })} options={["手动创建", "迁移预警", "政策到期", "企服保障", "企业档案"]} /></FormField><FormField label="执行人"><NativeSelect bare label="执行人" allowEmpty={false} value={form.owner} onChange={(value) => setForm({ ...form, owner: value })} options={platformUsers} /></FormField><FormField label="计划走访日期" required><Input type="date" value={form.planDate} onChange={(event) => setForm({ ...form, planDate: event.target.value })} required /></FormField><FormField label="优先级"><NativeSelect bare label="优先级" allowEmpty={false} value={form.priority} onChange={(value) => setForm({ ...form, priority: value })} options={["高", "中", "低"]} /></FormField><FormField label="备注"><Textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></FormField></FormDialog>
    <FormDialog open={Boolean(completeOrder)} onOpenChange={(open) => !open && setCompleteOrder(null)} title="完成走访" description={completeOrder?.title} onSubmit={completeVisit}><FormField label="走访结果" required><Textarea value={complete.result} onChange={(event) => setComplete({ ...complete, result: event.target.value })} required placeholder="记录企业需求、风险反馈和后续事项" /></FormField><FormField label="走访时长"><Input value={complete.duration} onChange={(event) => setComplete({ ...complete, duration: event.target.value })} /></FormField></FormDialog>
    <Sheet open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}><SheetContent side="right" className="business-detail-sheet"><SheetHeader><SheetTitle>{detail?.title}</SheetTitle><SheetDescription>走访工单 · {detail?.status}</SheetDescription></SheetHeader>{detail && <><DetailFields row={detail} labels={visitFieldLabels} />{detail.status !== "已完成" && <ActionButton action="编辑" onClick={() => { setCompleteOrder(detail); setDetail(null); }}>完成走访</ActionButton>}</>}</SheetContent></Sheet>
    <Sheet open={Boolean(recordDetail)} onOpenChange={(open) => !open && setRecordDetail(null)}><SheetContent side="right" className="business-detail-sheet"><SheetHeader><SheetTitle>{recordDetail?.title}</SheetTitle><SheetDescription>走访记录 · {recordDetail?.date}</SheetDescription></SheetHeader>{recordDetail && <DetailFields row={recordDetail} labels={visitFieldLabels} />}</SheetContent></Sheet></div>;
}
