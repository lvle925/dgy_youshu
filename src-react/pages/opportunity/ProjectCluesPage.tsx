import { ActionButton, useAllowedAction, usePrincipal } from "@/app/AccessContext";
import { useCurrentCity } from "@/app/CityContext";
import { useReportExport } from "@/app/ReportQueue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { FormDialog, FormField, NativeSelect, PageHeading, PageSection, SearchField, StatusValue } from "@/pages/PagePrimitives";
import { DataTable, type DataColumn } from "@/../src/components/shared/DataTable";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { StatusTag } from "@/../src/components/shared/StatusTag";
import { clues } from "../../../src/data/mock.js";
import { api } from "../../../src/api.js";
import { Download, Eye, Plus, Target } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

type Row = Record<string, any> & { id: string | number };

const stages = ["线索摸排", "研判评审", "载体选址匹配", "拟签约", "落地纳统"];
const clueStatuses = ["待跟进", "跟进中", "已对接", "已签约", "已搁置"];
const scoreBands = [
  { label: "85 分及以上", key: "high", matches: (score: number) => score >= 85 },
  { label: "70–84 分", key: "mid", matches: (score: number) => score >= 70 && score < 85 },
  { label: "70 分以下", key: "low", matches: (score: number) => score < 70 },
];

export function ProjectCluesPage() {
  const data = useBusinessCollection<Row>({ key: "youshu-clues", seed: clues, apiCollection: "clues" });
  const { city } = useCurrentCity();
  const principal = usePrincipal();
  const enqueue = useReportExport();
  const canEdit = useAllowedAction("编辑");
  const canViewSensitive = useAllowedAction("查看敏感信息");
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [band, setBand] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [sensitiveContact, setSensitiveContact] = useState<{ contact: string; phone: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [form, setForm] = useState({ company: "", intent: "", region: "", industry: "", source: "商机摸排", contact: "", phone: "", park: "", desc: "" });
  const [progress, setProgress] = useState({ note: "", status: "跟进中" });

  const filtered = data.rows
    .filter((row) => !keyword || `${row.company} ${row.intent} ${row.industry}`.includes(keyword))
    .filter((row) => !status || row.status === status)
    .filter((row) => !band || scoreBands.find((item) => item.key === band)?.matches(Number(row.score ?? 0)));

  async function showSensitiveContact(row: Row) {
    try {
      const result = await api.sensitiveProjectContact(row.id);
      setSensitiveContact({ contact: result.contact || "未登记", phone: result.phone || "未登记" });
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "无法查阅敏感信息");
    }
  }

  async function claim(row: Row) {
    try {
      const updated = await api.claimProject(row.id);
      setSelected(updated);
      await data.refresh();
      toast.success("项目已纳入本人招商台账");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "认领失败");
    }
  }

  async function release(row: Row) {
    try {
      const updated = await api.releaseProject(row.id);
      setSelected(updated);
      await data.refresh();
      toast.success("项目已退回公海");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "退回公海失败");
    }
  }

  async function advance(row: Row) {
    const currentIndex = Math.max(0, stages.indexOf(row.stage || stages[0]));
    const nextStage = stages[currentIndex + 1];
    if (!nextStage) return;
    try {
      const updated = await api.advanceProject(row.id, nextStage);
      setSelected(updated);
      await data.refresh();
      toast.success(`项目已推进至${nextStage}`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "项目推进失败");
    }
  }

  async function addLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.company.trim() || !form.intent.trim()) return toast.warning("请填写企业名称和项目线索");
    try {
      await data.createRecord({
        ...form,
        targetCity: city,
        city,
        level: "B",
        score: 72,
        date: new Date().toISOString().slice(0, 10),
        status: "待跟进",
        stage: stages[0],
        history: [],
        ownerId: principal?.memberId || principal?.user,
        owner: principal?.displayName || principal?.user,
        ownerDepartment: principal?.departmentId || "",
        createdBy: principal?.user,
      } as Omit<Row, "id">);
      setAddOpen(false);
      setForm({ company: "", intent: "", region: "", industry: "", source: "商机摸排", contact: "", phone: "", park: "", desc: "" });
      toast.success("项目线索已入库");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "新增失败");
    }
  }

  async function saveProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !progress.note.trim()) return toast.warning("请填写进展说明");
    try {
      await data.updateRecord(selected.id, { note: progress.note.trim(), status: progress.status, updated: new Date().toISOString().slice(0, 10) });
      setProgressOpen(false);
      setSelected((current) => current ? { ...current, note: progress.note.trim(), status: progress.status } : null);
      toast.success("项目进展已记录");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "进展保存失败");
    }
  }

  const columns: DataColumn<Row>[] = [
    { key: "intent", header: "项目线索", sortable: true },
    { key: "company", header: "关联企业", sortable: true },
    { key: "region", header: "企业区域" },
    { key: "industry", header: "所属行业" },
    { key: "score", header: "意愿度", sortable: true, cell: (row) => <StatusTag value={`${row.score} 分`} tone={row.score >= 85 ? "success" : row.score >= 70 ? "warning" : "neutral"} /> },
    { key: "stage", header: "推进阶段", cell: (row) => <StatusValue value={row.stage || stages[0]} /> },
    { key: "owner", header: "跟进归属", cell: (row) => row.owner || "公海" },
    { key: "status", header: "跟进状态", cell: (row) => <StatusValue value={row.status} /> },
    { key: "updated", header: "最近更新", sortable: true },
    { key: "action", header: "操作", cell: (row) => <div className="table-action-buttons">
      {canEdit && !row.owner && <Button size="sm" variant="outline" onClick={() => void claim(row)}>认领</Button>}
      {canEdit && row.owner && (row.ownerId === principal?.user || row.ownerId === principal?.memberId) && <Button size="sm" variant="outline" onClick={() => void release(row)}>退回公海</Button>}
    </div> },
  ];

  return <div className="business-page">
    <PageHeading title="项目线索" description="项目线索与企业信息依政务授权查阅，所有项目推进和敏感信息访问均留痕" source={data.source} actions={<>
      <ActionButton action="导出" variant="outline" onClick={() => enqueue("项目线索.csv", [
        { header: "企业", value: (row) => row.company },
        { header: "项目线索", value: (row) => row.intent },
        { header: "推进阶段", value: (row) => row.stage },
        { header: "意愿度", value: (row) => row.score },
      ], filtered)}><Download data-icon="inline-start" />导出台账</ActionButton>
      <ActionButton action="新增" onClick={() => setAddOpen(true)}><Plus data-icon="inline-start" />新增线索</ActionButton>
    </>} />
    <div className="business-metric-grid">
      <MetricCard title="项目总量" value={data.rows.length} description="当前授权数据范围" icon={<Target />} />
      <MetricCard title="待研判" value={data.rows.filter((row) => (row.stage || stages[0]) === stages[0]).length} description="线索摸排阶段" />
      <MetricCard title="推进中" value={data.rows.filter((row) => stages.indexOf(row.stage) > 0 && stages.indexOf(row.stage) < 4).length} description="研判、选址与拟签约" />
      <MetricCard title="落地纳统" value={data.rows.filter((row) => row.stage === stages[4]).length} description="已形成落地成果" />
    </div>
    <PageSection title="招商项目台账" description={`当前筛选 ${filtered.length} 条，完整企业信息按角色和园区数据范围授权`}>
      <div className="risk-segments" aria-label="意愿度分层">
        {scoreBands.map((item) => <Button key={item.key} variant={band === item.key ? "default" : "outline"} aria-pressed={band === item.key} onClick={() => setBand(band === item.key ? "" : item.key)}>{item.label} · {data.rows.filter((row) => item.matches(Number(row.score ?? 0))).length}</Button>)}
      </div>
      <div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="企业名称、行业或项目线索" /><NativeSelect label="跟进状态" value={status} onChange={setStatus} options={clueStatuses} /></div>
      <DataTable columns={columns} data={filtered} openRowDetails={false} onRowClick={setSelected} detailTitle="项目线索详情" />
    </PageSection>

    <Sheet open={Boolean(selected)} onOpenChange={(open) => { if (!open) { setSelected(null); setSensitiveContact(null); } }}>
      <SheetContent side="right" className="business-detail-sheet">
        <SheetHeader><SheetTitle>{selected?.company}</SheetTitle><SheetDescription>{selected?.region} · {selected?.industry} · {selected?.stage || stages[0]}</SheetDescription></SheetHeader>
        {selected && <>
          <p className="business-detail-intro">{selected.desc || "暂无项目概况"}</p>
          <dl className="business-detail-list">
            <div><dt>项目意向</dt><dd>{selected.intent || "待补充"}</dd></div>
            <div><dt>意愿度</dt><dd>{selected.score ?? "—"} 分</dd></div>
            <div><dt>预计投资</dt><dd>{selected.investment || "待研判"}</dd></div>
            <div><dt>推荐园区</dt><dd>{selected.park || "待匹配"}</dd></div>
            <div><dt>跟进归属</dt><dd>{selected.owner ? `${selected.owner} · ${selected.ownerDepartment || ""}` : "公海项目"}</dd></div>
            <div><dt>联系人</dt><dd>{sensitiveContact?.contact || selected.contact || "未登记"}</dd></div>
            <div><dt>联系电话</dt><dd className="sensitive-phone-value">{sensitiveContact?.phone || selected.phone || "未登记"}{!sensitiveContact && canViewSensitive && <ActionButton action="查看敏感信息" target="/business/projectCluesUpdate/index" size="sm" variant="ghost" onClick={() => void showSensitiveContact(selected)}><Eye data-icon="inline-start" />查看完整号码</ActionButton>}</dd></div>
            <div><dt>最近进展</dt><dd>{selected.note || "暂无进展记录"}</dd></div>
          </dl>
          <section className="project-stage-timeline" aria-label="项目推进时间轴">
            <h3>政务项目推进时间轴</h3>
            <ol>{stages.map((stage, index) => {
              const activeIndex = stages.indexOf(selected.stage || stages[0]);
              const event = (selected.history ?? []).find((item: Row) => item.to === stage);
              return <li className={index <= activeIndex ? "is-complete" : ""} key={stage}><span>{stage}</span><small>{event?.time ? new Date(event.time).toLocaleString("zh-CN") : index === activeIndex ? "当前阶段" : "待推进"}</small></li>;
            })}</ol>
          </section>
          <div className="business-detail-actions">
            {canEdit && <Button variant="outline" onClick={() => { setProgress({ note: "", status: selected.status || "跟进中" }); setProgressOpen(true); }}>记录跟进</Button>}
            {canEdit && !selected.owner && <Button onClick={() => void claim(selected)}>公海认领</Button>}
            {canEdit && stages.indexOf(selected.stage || stages[0]) < stages.length - 1 && <Button onClick={() => void advance(selected)}>推进至下一阶段</Button>}
          </div>
        </>}
      </SheetContent>
    </Sheet>

    <FormDialog open={addOpen} onOpenChange={setAddOpen} title="新增项目线索" onSubmit={addLead}>
      <FormField label="企业名称" required><Input value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} required /></FormField>
      <FormField label="项目线索" required><Input value={form.intent} onChange={(event) => setForm({ ...form, intent: event.target.value })} required /></FormField>
      <FormField label="企业区域"><Input value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} /></FormField>
      <FormField label="所属行业"><Input value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })} /></FormField>
      <FormField label="联系人"><Input value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} /></FormField>
      <FormField label="联系电话"><Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></FormField>
      <FormField label="意向园区"><Input value={form.park} onChange={(event) => setForm({ ...form, park: event.target.value })} /></FormField>
      <FormField label="项目概况"><Textarea value={form.desc} onChange={(event) => setForm({ ...form, desc: event.target.value })} /></FormField>
    </FormDialog>

    <FormDialog open={progressOpen} onOpenChange={setProgressOpen} title="记录项目进展" description={selected?.company} onSubmit={saveProgress}>
      <FormField label="跟进状态"><select className="business-input" value={progress.status} onChange={(event) => setProgress({ ...progress, status: event.target.value })}>{clueStatuses.map((item) => <option key={item}>{item}</option>)}</select></FormField>
      <FormField label="进展说明" required><Textarea value={progress.note} onChange={(event) => setProgress({ ...progress, note: event.target.value })} placeholder="记录接洽、评审、选址或签约情况" required /></FormField>
    </FormDialog>
  </div>;
}
