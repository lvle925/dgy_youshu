import { useReportExport } from "@/app/ReportQueue";
import { ActionButton } from "@/app/AccessContext";
import { useMemo, useState } from "react";
import { Download, FilePlus2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable, type DataColumn } from "@/../src/components/shared/DataTable";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { guaranteeRecords } from "../../../src/data/mock.js";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { NativeSelect, PageHeading, PageSection, SearchField, SectionTabs, StatusValue } from "@/pages/PagePrimitives";

type Row = Record<string, any> & { id: string | number };

export function GuaranteePage() {
  const enqueue = useReportExport();
  const data = useBusinessCollection<Row>({ key: "youshu-guarantee-records", seed: guaranteeRecords });
  const [tab, setTab] = useState("report");
  const [keyword, setKeyword] = useState("");
  const [park, setPark] = useState("");
  const [owner, setOwner] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const taskRows: Row[] = useMemo(() => {
    if (tab === "tech") return data.rows.map((row, index) => ({ ...row, status: ["培育中", "待匹配", "已對接"][index % 3], date: `2026-11-${String(10 + index).padStart(2, "0")}` }));
    if (tab === "expire") return data.rows.map((row, index) => ({ ...row, status: index % 3 ? "即将到期" : "已提醒", date: `2026-12-${String(5 + index).padStart(2, "0")}`, days: [12, 26, 45, 68, 30, 55, 88, 21, 39, 72, 18, 60][index] }));
    if (tab === "match") return data.rows.map((row, index) => ({ ...row, status: ["待匹配", "已匹配", "申报中"][index % 3], date: `2026-11-${String(10 + index).padStart(2, "0")}`, match: [96, 92, 89, 95, 87, 91, 84, 93, 88, 90, 86, 80][index] }));
    return data.rows;
  }, [data.rows, tab]);
  const filtered = taskRows.filter((row) => (!keyword || String(row.name).includes(keyword)) && (!park || row.park === park) && (!owner || row.owner === owner));
  const tabColumns: Record<string, DataColumn<Row>[]> = {
    report: [{ key: "name", header: "企业名称" }, { key: "park", header: "所属园区" }, { key: "owner", header: "负责人" }, { key: "status", header: "年报状态", cell: (row) => <StatusValue value={row.status} /> }, { key: "date", header: "最近申报时间" }, { key: "address", header: "注册地址" }],
    tech: [{ key: "name", header: "企业名称" }, { key: "park", header: "所属园区" }, { key: "owner", header: "负责人" }, { key: "status", header: "培育阶段", cell: (row) => <StatusValue value={row.status} /> }, { key: "date", header: "更新时间" }, { key: "address", header: "注册地址" }],
    expire: [{ key: "name", header: "企业名称" }, { key: "park", header: "所属园区" }, { key: "owner", header: "负责人" }, { key: "status", header: "提醒状态", cell: (row) => <StatusValue value={row.status} /> }, { key: "date", header: "到期日期" }, { key: "days", header: "剩余天数", sortable: true }],
    match: [{ key: "name", header: "企业名称" }, { key: "park", header: "所属园区" }, { key: "owner", header: "负责人" }, { key: "status", header: "匹配状态", cell: (row) => <StatusValue value={row.status} /> }, { key: "match", header: "最高匹配度", sortable: true, cell: (row) => `${row.match}%` }, { key: "date", header: "更新时间" }],
  };
  async function process(row: Row) { try { await data.updateRecord(row.id, { ...row, status: row.status === "已申报" ? "已提醒" : "已申报", date: new Date().toISOString().slice(0, 10) }); toast.success(`已为 ${row.name} 创建服务提醒`); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "操作失败"); } }
  const tabItems = [{ key: "report", label: "年报报送", count: data.rows.filter((row) => String(row.status).startsWith("未报送")).length }, { key: "tech", label: "科技企业培育", count: data.rows.length }, { key: "expire", label: "政策到期提醒", count: data.rows.filter((row) => String(row.status).startsWith("未报送")).length }, { key: "match", label: "政策精准匹配", count: data.rows.length }];
  return <div className="business-page"><PageHeading title="企服保障" description="把年报、科技企业培育、政策到期和精准匹配转成可跟进任务" source={data.source} actions={<Button variant="outline" onClick={() => toast.success(`已向 ${filtered.length} 家企业发送服务提醒`)}>批量提醒</Button>} /><div className="business-metric-grid"><MetricCard title="待年报提醒" value={data.rows.filter((row) => String(row.status).startsWith("未报送")).length} description="企业年报报送跟进" icon={<FilePlus2 />} /><MetricCard title="科技企业培育" value={data.rows.length} description="纳入培育服务" /><MetricCard title="政策到期提醒" value="238" description="未来 90 天到期" /><MetricCard title="政策匹配结果" value="1,656" description="待企业申报跟进" /></div><PageSection title="企业服务任务" description={`当前 ${filtered.length} 条任务`}><SectionTabs items={tabItems} value={tab} onChange={(value) => { setTab(value); setKeyword(""); setPark(""); setOwner(""); }} /><div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="搜索企业名称" /><NativeSelect label="所属园区" value={park} onChange={setPark} options={[...new Set(taskRows.map((row) => row.park))]} /><NativeSelect label="负责人" value={owner} onChange={setOwner} options={[...new Set(taskRows.map((row) => row.owner))]} /><ActionButton action="导出" variant="outline" onClick={() => enqueue("企业服务.csv", [{ header: "任务", value: row => row.name }, { header: "园区", value: row => row.park }, { header: "负责人", value: row => row.owner }, { header: "状态", value: row => row.status }], filtered)}><Download data-icon="inline-start" />导出</ActionButton></div><DataTable columns={[...tabColumns[tab], { key: "action", header: "操作", cell: (row) => <Button size="sm" variant="outline" onClick={() => void process(row)}>{tab === "report" ? "发送年报提醒" : tab === "match" ? "查看匹配" : "创建服务任务"}</Button> }]} data={filtered} openRowDetails={false} onRowClick={setSelected} detailTitle="企业服务保障" /></PageSection><Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><SheetContent side="right" className="business-detail-sheet"><SheetHeader><SheetTitle>{selected?.name}</SheetTitle><SheetDescription>{tabItems.find((item) => item.key === tab)?.label}</SheetDescription></SheetHeader>{selected && <><dl className="business-detail-list">{Object.entries(selected).filter(([key]) => key !== "id").map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value ?? "—")}</dd></div>)}</dl><Button onClick={() => void process(selected)}>创建服务跟进</Button></>}</SheetContent></Sheet></div>;
}
