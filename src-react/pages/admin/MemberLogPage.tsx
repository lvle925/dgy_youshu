import { useReportExport } from "@/app/ReportQueue";
import { ActionButton } from "@/app/AccessContext";
import { DataTable, type DataColumn } from "@/../src/components/shared/DataTable";
import { DetailFields } from "@/../src/components/shared/DetailFields";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "../../../src/api.js";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { NativeSelect, PageHeading, PageSection, SearchField, StatusValue } from "@/pages/PagePrimitives";
import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

type Row = Record<string, any> & { id: string | number };

const moduleLabels: Record<string, string> = {
  departments: "组织架构", members: "人员管理", roles: "角色管理", policies: "政策管理",
  clues: "项目线索", companyArchives: "企业档案", campusList: "园区管理", migrationWarnings: "迁移预警",
  serviceRequests: "企服保障", visitOrders: "走访工单", visitRecords: "走访记录", tenantSettings: "系统配置",
  auth: "登录认证", api: "接口调用", records: "业务台账", aiTasks: "外呼任务", aiRecords: "通话记录",
};

export function MemberLogPage() {
  const enqueue = useReportExport();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [operator, setOperator] = useState(() => new URLSearchParams(window.location.search).get("operator") ?? "");
  const [module, setModule] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const departments = useBusinessCollection<Row>({ key: "youshu-departments", seed: [], apiCollection: "departments" });
  const departmentNames = useMemo(() => new Map(departments.rows.map((row) => [String(row.id), String(row.name ?? "")])), [departments.rows]);
  function load() {
    setLoading(true);
    api.auditLogs({ limit: "5000" })
      .then((value) => { setRows(value as Row[]); setError(""); })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "审计日志加载失败"))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);
  const filtered = rows.filter((row) => (!keyword || `${row.title} ${row.objectType} ${row.objectId} ${row.after ?? ""}`.includes(keyword))
    && (!operator || row.operator === operator)
    && (!module || row.type === module)
    && (!from || String(row.time ?? "").slice(0, 10) >= from)
    && (!to || String(row.time ?? "").slice(0, 10) <= to));
  const operators = useMemo(() => [...new Set(rows.map((row) => String(row.operator ?? "")).filter(Boolean))], [rows]);
  const hasFilter = Boolean(keyword || operator || module || from || to);
  const modules = useMemo(() => [...new Set(rows.map((row) => String(row.type ?? "")).filter(Boolean))], [rows]);
  const departmentLabel = (row: Row) => departmentNames.get(String(row.departmentId ?? "")) || row.departmentId || "未登记";
  const moduleLabel = (row: Row) => moduleLabels[String(row.type ?? "")] ?? row.type ?? "—";
  const columns: DataColumn<Row>[] = [
    { key: "title", header: "操作事项", sortable: true },
    { key: "operator", header: "操作人" },
    { key: "departmentId", header: "所属部门", cell: (row) => departmentLabel(row) },
    { key: "type", header: "业务模块", cell: (row) => moduleLabel(row) },
    { key: "objectId", header: "操作对象" },
    { key: "status", header: "结果", cell: (row) => <StatusValue value={row.status} /> },
    { key: "ip", header: "来源 IP" },
    { key: "time", header: "发生时间", sortable: true },
  ];
  return <div className="business-page">
    <PageHeading title="操作日志" description="登录成败、敏感信息查阅、业务变更和批量导出均记入审计台账" actions={<ActionButton action="导出" variant="outline" onClick={() => enqueue("操作审计日志.csv", [
      { header: "操作事项", value: (row) => row.title }, { header: "操作人", value: (row) => row.operator },
      { header: "部门", value: departmentLabel }, { header: "模块", value: moduleLabel },
      { header: "对象", value: (row) => `${row.objectType} ${row.objectId}` }, { header: "结果", value: (row) => row.status },
      { header: "IP", value: (row) => row.ip }, { header: "时间", value: (row) => row.time },
    ], filtered)}><Download data-icon="inline-start" />导出审计记录</ActionButton>} />
    <PageSection title="审计事件" description={error ? "审计日志读取失败" : `当前返回 ${filtered.length} 条符合条件的记录`} error={error} onRetry={load}>
      {loading && !rows.length ? <div className="business-loading"><Skeleton className="h-5 w-1/4" /><Skeleton className="h-32 w-full" /></div> : <>
        <div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="操作内容、对象或摘要" /><NativeSelect label="操作人" value={operator} onChange={setOperator} options={operators} /><NativeSelect label="业务模块" value={module} onChange={setModule} options={modules} /><label className="business-map-field"><span>起始日期</span><Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label className="business-map-field"><span>截止日期</span><Input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>{hasFilter && <Button variant="ghost" onClick={() => { setKeyword(""); setOperator(""); setModule(""); setFrom(""); setTo(""); }}>重置</Button>}</div>
        <DataTable columns={columns} data={filtered} openRowDetails={false} onRowClick={setSelected} detailTitle="操作审计详情" onResetFilters={hasFilter ? () => { setKeyword(""); setOperator(""); setModule(""); setFrom(""); setTo(""); } : undefined} emptyText="没有符合条件的审计记录" />
      </>}
    </PageSection>
    <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><SheetContent side="right" className="business-detail-sheet"><SheetHeader><SheetTitle>{selected?.title}</SheetTitle><SheetDescription>{selected?.operator} · {selected?.time}</SheetDescription></SheetHeader>{selected && <DetailFields row={selected} labels={{ departmentId: "所属部门", objectType: "对象类型", objectId: "对象编号", after: "变更后内容", before: "变更前内容" }} />}</SheetContent></Sheet>
  </div>;
}
