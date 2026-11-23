import { useReportExport } from "@/app/ReportQueue";
import { ActionButton } from "@/app/AccessContext";
import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/../src/components/shared/DataTable";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { logs } from "../../../src/data/mock.js";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { NativeSelect, PageHeading, PageSection, SearchField, StatusValue } from "@/pages/PagePrimitives";
import { normalizedLogs } from "./normalizedLogs";

type Row = Record<string, any> & { id: string | number };

export function MemberLogPage() {
  const enqueue = useReportExport();
  const data = useBusinessCollection<Row>({ key: "youshu-operation-logs-v2", seed: normalizedLogs });
  const [keyword, setKeyword] = useState("");
  const [operator, setOperator] = useState("");
  const [type, setType] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const filtered = data.rows.filter((row) => (!keyword || `${row.title} ${row.content}`.includes(keyword)) && (!operator || row.operator === operator) && (!type || row.type === type));
  return <div className="business-page"><PageHeading title="操作日志" description="审计平台内的账号、数据和配置变更行为" source={data.source} actions={<ActionButton action="导出" variant="outline" onClick={() => enqueue("操作日志.csv", [{ header: "操作", value: row => row.title }, { header: "操作员", value: row => row.operator }, { header: "模块", value: row => row.type }, { header: "时间", value: row => row.time }], filtered)}><Download data-icon="inline-start" />导出日志</ActionButton>} /><PageSection title="操作记录" description={`共 ${filtered.length} 条`}><div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="搜索操作内容或对象" /><NativeSelect label="操作人" value={operator} onChange={setOperator} options={[...new Set(data.rows.map((row) => row.operator))]} /><NativeSelect label="操作类型" value={type} onChange={setType} options={[...new Set(data.rows.map((row) => row.type))]} /></div><DataTable columns={[{ key: "title", header: "操作事项", sortable: true }, { key: "operator", header: "操作人" }, { key: "type", header: "操作类型", cell: (row) => <StatusValue value={row.type} /> }, { key: "content", header: "操作内容" }, { key: "ip", header: "IP 地址" }, { key: "time", header: "操作时间", sortable: true }]} data={filtered} openRowDetails={false} onRowClick={setSelected} detailTitle="操作日志详情" /></PageSection><Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><SheetContent side="right" className="business-detail-sheet"><SheetHeader><SheetTitle>{selected?.title}</SheetTitle><SheetDescription>操作审计详情</SheetDescription></SheetHeader>{selected && <dl className="business-detail-list">{Object.entries(selected).filter(([key]) => key !== "id").map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value ?? "—")}</dd></div>)}</dl>}</SheetContent></Sheet></div>;
}
