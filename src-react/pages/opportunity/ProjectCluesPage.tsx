import { useCurrentCity } from "@/app/CityContext";
import { usePoints } from "@/app/PointsContext";
import { ActionButton, useAllowedAction } from "@/app/AccessContext";
import { useReportExport } from "@/app/ReportQueue";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusTag } from "@/../src/components/shared/StatusTag";
import { SectionTabs } from "@/pages/PagePrimitives";
import { useState, type FormEvent } from "react";
import { Download, Plus, Target } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type DataColumn } from "@/../src/components/shared/DataTable";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { clues } from "../../../src/data/mock.js";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { FormDialog, FormField, NativeSelect, PageHeading, PageSection, SearchField, StatusValue } from "@/pages/PagePrimitives";

type Row = Record<string, any> & { id: string | number };

const clueStatuses = ["待跟进", "跟进中", "已对接", "已签约", "已搁置"];

export function ProjectCluesPage() {
  const data = useBusinessCollection<Row>({ key: "youshu-clues", seed: clues, apiCollection: "clues" });
  const { city } = useCurrentCity();
  const { balance, unlock } = usePoints();
  const enqueue = useReportExport();
  const canEdit = useAllowedAction("编辑");
  const [unlockRow, setUnlockRow] = useState<Row | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [tab, setTab] = useState("pool");
  const [band, setBand] = useState("");
  const unlocked = (row: Row) => balance?.unlockedIds.includes(String(row.id)) ?? false;
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [updateRow, setUpdateRow] = useState<Row | null>(null);
  const [note, setNote] = useState("");
  const [nextStatus, setNextStatus] = useState("跟进中");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ company: "", intent: "", region: "上海市", industry: "人工智能", source: "商机摸排", contact: "", phone: "", park: "", desc: "" });
  const pool = data.rows.filter(row => !unlocked(row));
  const unlockedRows = data.rows.filter(unlocked);
  const currentRows = tab === "pool" ? pool : unlockedRows;
  const bands = [
    { label: "85 分及以上", key: "high", matches: (score: number) => score >= 85 },
    { label: "70–84 分", key: "mid", matches: (score: number) => score >= 70 && score < 85 },
    { label: "70 分以下", key: "low", matches: (score: number) => score < 70 },
  ];
  const filtered = currentRows.filter(row => (!band || bands.find(item => item.key === band)?.matches(row.score))).filter((row) => (!keyword || (unlocked(row) ? row.company + " " + row.intent : row.intent).includes(keyword)) && (!status || row.status === status));
  async function confirmUnlock() {
    if (!unlockRow || unlocking) return;
    setUnlocking(true);
    try {
      await unlock(unlockRow.id);
      await data.refresh();
      setTab("unlocked");
      setBand("");
      setKeyword("");
      setStatus("");
      setUnlockRow(null);
      toast.success("项目已解锁，积分已扣减 10");
    } catch (error) { toast.error(error instanceof Error ? error.message : "解锁失败"); }
    finally { setUnlocking(false); }
  }
  const openUpdate = (row: Row) => { setUpdateRow(row); setNextStatus(row.status === "已签约" ? "已签约" : "跟进中"); setNote(""); };
  async function saveUpdate(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!updateRow || !note.trim()) return toast.warning("请填写进展说明"); try { await data.updateRecord(updateRow.id, { note: note.trim(), status: nextStatus, updated: new Date().toISOString().slice(0, 10) }); setUpdateRow(null); toast.success("线索进展已更新"); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "更新失败"); } }
  async function addLead(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!form.company.trim() || !form.intent.trim()) return toast.warning("请填写企业名称和项目线索"); try { await data.createRecord({ ...form, targetCity: city, level: "B", score: 72, date: new Date().toISOString().slice(0, 10), status: "待跟进", note: "新入池线索" } as Omit<Row, "id">); setAddOpen(false); setForm({ ...form, company: "", intent: "", contact: "", phone: "", park: "", desc: "" }); toast.success("项目线索已入池"); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "新增失败"); } }
  const columns: DataColumn<Row>[] = [{ key: "intent", header: "项目线索", sortable: true }, { key: "company", header: "关联企业", cell: row => row.company || "待补充" }, { key: "region", header: "企业区域" }, { key: "industry", header: "所属行业" }, { key: "score", header: "意愿度", sortable: true, cell: (row) => <StatusTag value={row.score + " 分"} tone={row.score >= 85 ? "success" : row.score >= 70 ? "warning" : "neutral"} /> }, { key: "status", header: "跟进状态", cell: (row) => <StatusValue value={row.status} /> }, { key: "updated", header: "最近更新", sortable: true }, { key: "action", header: "操作", cell: (row) => canEdit && <Button size="sm" variant="outline" onClick={() => unlocked(row) ? openUpdate(row) : setUnlockRow(row)}>{unlocked(row) ? "更新进展" : "解锁项目"}</Button> }];
  return <div className="business-page"><PageHeading title="项目线索" description="项目线索池与跟进动态，承接企业扩张和商机摸排成果" source={data.source} actions={<><ActionButton action="导出" variant="outline" onClick={() => enqueue("项目线索.csv", [{ header: "企业", value: row => unlocked(row) ? row.company : "解锁后查看" }, { header: "线索", value: row => row.intent }, { header: "意愿度", value: row => row.score }], filtered)}><Download data-icon="inline-start" />导出</ActionButton><ActionButton action="新增" onClick={() => setAddOpen(true)}><Plus data-icon="inline-start" />新增线索</ActionButton></>} /><div className="business-metric-grid"><MetricCard title="线索总量" value={data.rows.length} description="当前项目线索池" icon={<Target />} /><MetricCard title="待跟进" value={data.rows.filter((row) => row.status === "待跟进").length} description="需要分配跟进人员" /><MetricCard title="跟进中" value={data.rows.filter((row) => row.status === "跟进中").length} description="持续推进中" /><MetricCard title="已签约" value={data.rows.filter((row) => row.status === "已签约").length} description="已形成落地成果" /></div><PageSection title="项目线索" description={balance ? "今日剩余 " + balance.remaining + " / " + balance.limit + " 积分" : "积分读取中"}><SectionTabs value={tab} onChange={value => { setTab(value); setBand(""); }} items={[{ key: "pool", label: "项目线索池", count: pool.length }, { key: "unlocked", label: "已解锁项目", count: unlockedRows.length }]} /><div className="risk-segments" aria-label="意愿度分层">{bands.map(item => <Button key={item.key} variant={band === item.key ? "default" : "outline"} aria-pressed={band === item.key} onClick={() => setBand(band === item.key ? "" : item.key)}>{item.label} · {currentRows.filter(row => item.matches(row.score)).length}</Button>)}</div><div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="企业名称或项目线索" /><NativeSelect label="跟进状态" value={status} onChange={setStatus} options={clueStatuses} /></div><DataTable columns={columns} data={filtered}  detailTitle="项目线索详情" renderDetails={(row) => <div className="business-detail-prose"><p>{row.desc}</p><p>阶段：{row.stage || row.status || "待研判"}</p><p>预计投资：{row.investment || "待研判"}</p>{unlocked(row) ? <><p>最新动态：{row.note || "暂无动态"}</p><p>联系人：{row.contact || "待补充"} · {row.phone || "待补充"}</p><p>项目研判：{row.analysis || "暂无研判"}</p><p>沟通记录：{row.conversation || "暂无记录"}</p></> : <p>解锁后可查看联系人和跟进动态。</p>}</div>} /></PageSection>
    <Dialog open={!!unlockRow} onOpenChange={open => { if (!open && !unlocking) setUnlockRow(null); }}><DialogContent><DialogHeader><DialogTitle>解锁项目</DialogTitle><DialogDescription>{unlockRow?.intent} · 意愿度 {unlockRow?.score} 分</DialogDescription></DialogHeader><p>消耗 10 积分，查看企业联系方式、项目研判及跟进记录。</p><p>今日剩余 {balance?.remaining ?? "—"} 积分</p><Button disabled={unlocking || !balance || balance.remaining < 10} onClick={() => void confirmUnlock()}>{unlocking ? "正在解锁…" : "确认解锁 · 10 积分"}</Button></DialogContent></Dialog>
    <FormDialog open={Boolean(updateRow)} onOpenChange={(open) => !open && setUpdateRow(null)} title="更新线索动态" description={updateRow?.company} onSubmit={saveUpdate}><FormField label="跟进状态"><select className="business-input" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>{clueStatuses.map((item) => <option key={item}>{item}</option>)}</select></FormField><FormField label="进展说明" required><Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="记录近期联系、考察或签约进展" required /></FormField></FormDialog>
    <FormDialog open={addOpen} onOpenChange={setAddOpen} title="新增项目线索" onSubmit={addLead}><FormField label="企业名称" required><Input value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} required /></FormField><FormField label="项目线索" required><Input value={form.intent} onChange={(event) => setForm({ ...form, intent: event.target.value })} required /></FormField><FormField label="所在区域"><Input value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} /></FormField><FormField label="所属行业"><Input value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })} /></FormField><FormField label="联系人"><Input value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} /></FormField><FormField label="联系电话"><Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></FormField><FormField label="意向园区"><Input value={form.park} onChange={(event) => setForm({ ...form, park: event.target.value })} /></FormField><FormField label="项目概况"><Textarea value={form.desc} onChange={(event) => setForm({ ...form, desc: event.target.value })} /></FormField></FormDialog></div>;
}
