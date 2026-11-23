import { useReportExport } from "@/app/ReportQueue";
import { ActionButton } from "@/app/AccessContext";
import { DataTable, type DataColumn } from "@/../src/components/shared/DataTable";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { api } from "../../../src/api.js";
import { NativeSelect, PageHeading, PageSection, SearchField, StatusValue } from "@/pages/PagePrimitives";
import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

type Row = Record<string, any> & { id: string | number };

export function MemberLogPage() {
  const enqueue = useReportExport();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [operator, setOperator] = useState("");
  const [module, setModule] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  useEffect(() => {
    api.auditLogs({ limit: "5000" }).then(setRows).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "审计日志加载失败"));
  }, []);
  const filtered = rows.filter((row) => (!keyword || `${row.title} ${row.objectType} ${row.objectId} ${row.after ?? ""}`.includes(keyword)) && (!operator || row.operator === operator) && (!module || row.type === module));
  const operators = useMemo(() => [...new Set(rows.map((row) => String(row.operator ?? "")).filter(Boolean))], [rows]);
  const modules = useMemo(() => [...new Set(rows.map((row) => String(row.type ?? "")).filter(Boolean))], [rows]);
  const columns: DataColumn<Row>[] = [
    { key: "title", header: "操作事项", sortable: true },
    { key: "operator", header: "操作人" },
    { key: "departmentId", header: "所属部门" },
    { key: "type", header: "业务模块" },
    { key: "objectId", header: "操作对象" },
    { key: "status", header: "结果", cell: (row) => <StatusValue value={row.status} /> },
    { key: "ip", header: "来源 IP" },
    { key: "time", header: "发生时间", sortable: true },
  ];
  return <div className="business-page">
    <PageHeading title="操作日志" description="登录成败、敏感信息查阅、业务变更和批量导出均记录于 MySQL op_log" actions={<ActionButton action="导出" variant="outline" onClick={() => enqueue("操作审计日志.csv", [
      { header: "操作事项", value: (row) => row.title }, { header: "操作人", value: (row) => row.operator },
      { header: "部门", value: (row) => row.departmentId }, { header: "模块", value: (row) => row.type },
      { header: "对象", value: (row) => `${row.objectType} ${row.objectId}` }, { header: "结果", value: (row) => row.status },
      { header: "IP", value: (row) => row.ip }, { header: "时间", value: (row) => row.time },
    ], filtered)}><Download data-icon="inline-start" />导出审计记录</ActionButton>} />
    <PageSection title="审计事件" description={error || `数据库当前返回 ${filtered.length} 条符合条件的记录`}>
      <div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="操作内容、对象或摘要" /><NativeSelect label="操作人" value={operator} onChange={setOperator} options={operators} /><NativeSelect label="业务模块" value={module} onChange={setModule} options={modules} /></div>
      <DataTable columns={columns} data={filtered} openRowDetails={false} onRowClick={setSelected} detailTitle="操作审计详情" />
    </PageSection>
    <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><SheetContent side="right" className="business-detail-sheet"><SheetHeader><SheetTitle>{selected?.title}</SheetTitle><SheetDescription>{selected?.operator} · {selected?.time}</SheetDescription></SheetHeader>{selected && <dl className="business-detail-list">{Object.entries(selected).filter(([key]) => key !== "id").map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value ?? "—")}</dd></div>)}</dl>}</SheetContent></Sheet>
  </div>;
}
