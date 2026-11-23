import { useCurrentCity } from "@/app/CityContext";
import { useAllowedAction } from "@/app/AccessContext";
import { useState } from "react";
import { Target } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable, type DataColumn } from "@/../src/components/shared/DataTable";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { clues, investigationTasks } from "../../../src/data/mock.js";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { NativeSelect, PageHeading, PageSection, SearchField, StatusValue } from "@/pages/PagePrimitives";

type Row = Record<string, any> & { id: string | number };

export function BusinessInvestigatePage() {
  const { city } = useCurrentCity();
  const canEdit = useAllowedAction("编辑");
  const canCreate = useAllowedAction("新增");
  const data = useBusinessCollection<Row>({ key: "youshu-investigation-tasks", seed: investigationTasks, apiCollection: "investigationTasks" });
  const leads = useBusinessCollection<Row>({ key: "youshu-clues", seed: clues, apiCollection: "clues" });
  const [keyword, setKeyword] = useState("");
  const [industry, setIndustry] = useState("");
  const [status, setStatus] = useState("");
  const [current, setCurrent] = useState<Row | null>(null);
  const filtered = data.rows.filter((row) => (!keyword || `${row.company} ${row.park}`.includes(keyword)) && (!industry || row.industry === industry) && (!status || row.status === status));
  async function changeStatus(row: Row, status: string) {
    try {
      const updated = await data.updateRecord(row.id, { status });
      setCurrent(current => current?.id === row.id ? updated : current);
      toast.success("摸排状态已更新");
    } catch (error) { toast.error(error instanceof Error ? error.message : "状态更新失败"); }
  }
  const columns: DataColumn<Row>[] = [
    { key: "company", header: "目标企业", sortable: true }, { key: "industry", header: "所属产业" }, { key: "demand", header: "空间需求" }, { key: "park", header: "推荐载体" }, { key: "owner", header: "跟进专员" }, { key: "updated", header: "最近更新", sortable: true }, { key: "status", header: "摸排状态", cell: (row) => <StatusValue value={row.status} /> }, { key: "action", header: "处理", cell: (row) => canEdit && <Button size="sm" variant="outline" onClick={() => void changeStatus(row, row.status === "已完成" ? "待跟进" : "已完成")}>{row.status === "已完成" ? "重新打开" : "完成摸排"}</Button> },
  ];
  return <div className="business-page"><PageHeading title="商机摸排" description="将企业需求、适配空间和招商主管跟进动作统一管理" source={data.source} /><div className="business-metric-grid"><MetricCard title="待摸排" value={data.rows.filter((row) => row.status === "待跟进").length} description="等待首次联系" icon={<Target />} /><MetricCard title="摸排中" value={data.rows.filter((row) => row.status === "摸排中").length} description="正在确认企业需求" /><MetricCard title="已确认需求" value={data.rows.filter((row) => row.status === "已确认").length} description="可进入载体匹配" /><MetricCard title="本月已完成" value={data.rows.filter((row) => row.status === "已完成").length} description="已形成摸排结论" /></div><PageSection title="摸排任务" description={`共 ${filtered.length} 项`}><div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="企业名称或推荐园区" /><NativeSelect label="所属产业" value={industry} onChange={setIndustry} options={[...new Set(data.rows.map((row) => row.industry))]} /><NativeSelect label="任务状态" value={status} onChange={setStatus} options={[...new Set(data.rows.map((row) => row.status))]} /></div><DataTable columns={columns} data={filtered} openRowDetails={false} onRowClick={setCurrent} detailTitle="商机摸排详情" /></PageSection><Sheet open={Boolean(current)} onOpenChange={(open) => !open && setCurrent(null)}><SheetContent side="right" className="business-detail-sheet"><SheetHeader><SheetTitle>{current?.company}</SheetTitle><SheetDescription>企业需求摸排与招商主管跟进</SheetDescription></SheetHeader>{current && <><div className="business-detail-intro">{current.demand} · {current.industry}</div><dl className="business-detail-list"><div><dt>建议载体</dt><dd>{current.park}</dd></div><div><dt>负责人</dt><dd>{current.owner}</dd></div><div><dt>企业标签</dt><dd>{(current.tags ?? []).join("、")}</dd></div></dl><PageSection title="操作记录">{(current.history ?? []).length ? <ul>{[...current.history].reverse().map((entry: { time: string; operator: string; from: string; to: string }, index: number) => <li key={index}>{new Date(entry.time).toLocaleString("zh-CN")} · {entry.operator} · {entry.from} → {entry.to}</li>)}</ul> : <p className="text-muted-foreground">暂无状态变更</p>}</PageSection>{canEdit && <NativeSelect label="摸排状态" value={current.status} onChange={value => void changeStatus(current, value)} options={["待跟进", "摸排中", "已确认", "已完成"]} />}{canCreate &&<Button className="business-sheet-action" onClick={() => { if (!current) return; void leads.createRecord({ company: current.company, intent: current.demand, region: city, targetCity: city, industry: current.industry, level: "B", source: "商机摸排", contact: "待补充", phone: "待补充", date: new Date().toISOString().slice(0, 10), status: "待跟进", park: current.park, score: 75, desc: `由商机摸排任务转入，负责人 ${current.owner}` }).then(() => { setCurrent(null); toast.success("已转入项目线索"); }).catch((cause) => toast.error(cause instanceof Error ? cause.message : "转入失败")); }}>转入项目线索</Button>}</>}</SheetContent></Sheet></div>;
}
