import { matchPolicies } from "./policyMatch";
import { useCurrentCity } from "@/app/CityContext";
import { ActionButton, useAllowedAction } from "@/app/AccessContext";
import { useReportExport } from "@/app/ReportQueue";
import { districtsFor } from "@/lib/cityData";
import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Plus, Search, Target } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChipFilter, matchesChipFilter, type ChipFilterGroup, type ChipFilterValue } from "@/../src/components/shared/ChipFilter";
import { DataTable, type DataColumn } from "@/../src/components/shared/DataTable";
import { StatBar } from "@/../src/components/shared/StatBar";
import { StatusTag } from "@/../src/components/shared/StatusTag";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { districts, industriesShort, levels, policies, policyNotices, policyPublicList, policyTopics, subsidyTypes } from "../../../src/data/mock.js";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { FormDialog, FormField, PageHeading, PageSection, SearchField, SectionTabs, StatusValue } from "@/pages/PagePrimitives";
import { readStoredIds } from "./policyDetails";
import { PolicyDetails } from "./policyDetails";

type Row = Record<string, any> & { id: string | number };

const policyGroups: ChipFilterGroup[] = [
  { key: "district", label: "地区", options: ["上海市", ...districts], limit: 8 },
  { key: "type", label: "补贴类型", options: subsidyTypes, limit: 8 },
  { key: "level", label: "级别", options: levels, limit: 4 },
  { key: "industry", label: "补贴行业", options: industriesShort, limit: 5 },
];

function selectedValues(row: Row, key: string) {
  if (key === "industry") return String(row.industry ?? "").split(/[；;,，]/).filter(Boolean);
  return row[key];
}

export function PolicyPage() {
  const collection = useBusinessCollection<Row>({ key: "youshu-policies", seed: policies, apiCollection: "policies" });
  const [tab, setTab] = useState("project");
  const [filter, setFilter] = useState<ChipFilterValue>({});
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [policyForm, setPolicyForm] = useState({ name: "", org: "", level: "市级", type: "研发投入", district: "浦东新区", deadline: "" });
  const { city } = useCurrentCity();
  const enqueue = useReportExport();
  const canEdit = useAllowedAction("编辑");
  const [submitted, setSubmitted] = useState(false);
  const [matchIndustry, setMatchIndustry] = useState("");
  const [matchRegion, setMatchRegion] = useState("");
  const [matchName, setMatchName] = useState("");
  const [matchResults, setMatchResults] = useState<Row[]>([]);
  const [poster, setPoster] = useState<Row | null>(null);
  const [intentIds, setIntentIds] = useState<string[]>(() => readStoredIds("youshu-policy-intents"));
  const navigate = useNavigate();
  const filtered = useMemo(() => collection.rows.filter((row) =>
    matchesChipFilter(row, policyGroups, filter, selectedValues) &&
    (!appliedKeyword || String(row.name).includes(appliedKeyword)),
  ), [collection.rows, filter, appliedKeyword]);
  const columns: DataColumn<Row>[] = [
    { key: "name", header: "政策项目名称", sortable: true, cell: (row) => <strong>{row.name}</strong> },
    { key: "level", header: "级别", sortable: true },
    { key: "org", header: "组织部门" },
    { key: "stars", header: "推荐等级", sortable: true, cell: (row) => <span className="policy-stars" aria-label={`${row.stars} 星推荐`}>{"★".repeat(Number(row.stars) || 0)}<span>{"★".repeat(Math.max(0, 5 - (Number(row.stars) || 0)))}</span></span> },
    { key: "type", header: "补贴类型" },
    { key: "companies", header: "获批企业", sortable: true, cell: (row) => Number(row.companies || 0).toLocaleString() },
    { key: "deadline", header: "申报截止", sortable: true },
    { key: "status", header: "状态", cell: (row) => <StatusValue value={row.status ?? "申报中"} /> },
  ];
  async function savePolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!policyForm.name.trim() || !policyForm.org.trim()) return toast.warning("请填写政策名称和组织部门");
    try {
      await collection.createRecord({
        ...policyForm, stars: 4, companies: 0, industry: "制造业；信息传输、软件和信息技术服务业", date: new Date().toISOString().slice(0, 10), amount: 0, status: "申报中", hot: 0,
      } as Omit<Row, "id">);
      setAddOpen(false);
      setPolicyForm({ name: "", org: "", level: "市级", type: "研发投入", district: "浦东新区", deadline: "" });
      toast.success("政策已保存");
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "政策保存失败"); }
  }
  function runMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!matchName.trim()) return toast.warning("请填写企业名称");
    setMatchResults(matchPolicies(collection.rows, { name: matchName.trim(), industry: matchIndustry.trim(), region: matchRegion.trim(), city }));
    setSubmitted(true);
  }
  return (
    <div className="business-page">
      <PageHeading title="政策管理" description="管理政策项目、通知文件、公示名单与申报匹配" source={collection.source} actions={<ActionButton action="新增" onClick={() => setAddOpen(true)}><Plus data-icon="inline-start" />新增政策</ActionButton>} />
      <PageSection>
        <SectionTabs items={[{ key: "project", label: "政策项目", count: collection.rows.length }, { key: "notice", label: "通知文件", count: policyNotices.length }, { key: "public", label: "公示名单", count: policyPublicList.length }, { key: "topic", label: "项目课题", count: policyTopics.length }, { key: "match", label: "一键政策匹配" }]} value={tab} onChange={setTab} />
        {tab === "project" && <>
          <ChipFilter groups={policyGroups} value={filter} onChange={setFilter} onSearch={setAppliedKeyword} onReset={() => { setFilter({}); setKeyword(""); setAppliedKeyword(""); }} keywordPlaceholder="请输入政策项目名称" />
          <div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="搜索政策项目名称" /><Button variant="outline" onClick={() => setAppliedKeyword(keyword.trim())}><Search data-icon="inline-start" />查询</Button><Button variant="ghost" onClick={() => { setFilter({}); setKeyword(""); setAppliedKeyword(""); }}>重置</Button><ActionButton action="导出" variant="outline" onClick={() => enqueue("政策项目.csv", [{ header: "政策名称", value: (row: Row) => row.name }, { header: "级别", value: (row: Row) => row.level }, { header: "组织部门", value: (row: Row) => row.org }, { header: "补贴类型", value: (row: Row) => row.type }, { header: "地区", value: (row: Row) => row.district }, { header: "获批企业", value: (row: Row) => row.companies }, { header: "申报截止", value: (row: Row) => row.deadline }, { header: "状态", value: (row: Row) => row.status }], filtered)}><Download data-icon="inline-start" />导出</ActionButton></div>
          <StatBar scope={Object.values(filter).some((items) => items.length) || appliedKeyword ? "当前筛选" : "全库口径"} items={[{ label: "政策项目", value: filtered.length, suffix: "条" }, { label: "申报中", value: filtered.filter((row) => row.status === "申报中").length, suffix: "项", tone: "success" }, { label: "覆盖企业", value: filtered.reduce((sum, row) => sum + Number(row.companies || 0), 0).toLocaleString(), suffix: "家" }, { label: "平均推荐等级", value: filtered.length ? (filtered.reduce((sum, row) => sum + Number(row.stars || 0), 0) / filtered.length).toFixed(1) : "0.0", suffix: "星" }, { label: "即将截止", value: filtered.filter((row) => row.deadline && row.deadline >= new Date().toISOString().slice(0, 10)).length, suffix: "项", tone: "gold" }]} />
          <DataTable columns={columns} data={filtered} detailTitle="政策详情" renderDetails={(row) => <div className="business-detail-prose"><h3>{row.name}</h3><p>{row.org} · {row.level} · {row.district}</p><p>申报截止：{row.deadline || "以发布通知为准"}</p><p>扶持力度：{row.amount ? Number(row.amount).toLocaleString() + " 万元（记录金额）" : row.type + " · 以申报通知为准"}</p><PolicyDetails row={row} /><div className="business-toolbar"><Button variant="outline" onClick={() => navigate("/policy/detail/" + row.id)}>打开完整政策</Button><ActionButton action="导出" onClick={() => setPoster(row)}>生成海报</ActionButton></div></div>} />
        </>}
        {tab === "notice" && <DataTable columns={[
          { key: "title", header: "通知标题", sortable: true }, { key: "org", header: "发布部门" }, { key: "type", header: "类型" }, { key: "date", header: "发布日期", sortable: true }, { key: "views", header: "浏览量", sortable: true },
        ]} data={policyNotices as Row[]} detailTitle="通知详情" />}
        {tab === "public" && <DataTable columns={[
          { key: "title", header: "名单名称" }, { key: "batch", header: "批次" }, { key: "org", header: "发布部门" }, { key: "date", header: "公示日期", sortable: true }, { key: "count", header: "企业数", sortable: true },
        ]} data={policyPublicList as Row[]} detailTitle="公示名单" />}
        {tab === "topic" && <DataTable columns={[
          { key: "title", header: "课题名称" }, { key: "org", header: "发布单位" }, { key: "field", header: "研究领域" }, { key: "budget", header: "课题经费" }, { key: "deadline", header: "申报截止", sortable: true }, { key: "status", header: "状态", cell: (row) => <StatusValue value={row.status} /> }, { key: "intent", header: "操作", cell: (row) => { const registered = intentIds.includes(String(row.id)); return canEdit && <Button size="sm" variant="outline" onClick={() => { const next = registered ? intentIds.filter((id) => id !== String(row.id)) : [...intentIds, String(row.id)]; setIntentIds(next); localStorage.setItem("youshu-policy-intents", JSON.stringify(next)); toast.success(registered ? "已取消申报意向" : `已登记「${row.title}」申报意向`); }}>{registered ? "已登记意向" : "登记意向"}</Button>; } },
        ]} data={policyTopics as Row[]} />}
        {tab === "match" && <div className="policy-match-layout">
          <form className="policy-match-form" onSubmit={runMatch}><h2>企业政策匹配</h2><p>按企业档案、行业和区域筛选政策，查看匹配依据。</p><FormField label="企业名称" required><Input value={matchName} onChange={(event) => setMatchName(event.target.value)} placeholder="输入企业名称" /></FormField><FormField label="所属行业"><Input placeholder="行业关键词，可从企业档案补全" value={matchIndustry} onChange={event => setMatchIndustry(event.target.value)} list="policy-industries" /><datalist id="policy-industries">{industriesShort.map(value => <option key={value} value={value} />)}</datalist></FormField><FormField label="所在区域"><Input placeholder={city} value={matchRegion} onChange={event => setMatchRegion(event.target.value)} list="policy-districts" /><datalist id="policy-districts">{[city, ...districtsFor(city)].map(value => <option key={value} value={value} />)}</datalist></FormField><Button type="submit"><Target data-icon="inline-start" />开始匹配</Button></form>
          <PageSection title="匹配结果" description={matchResults.length ? `找到 ${matchResults.length} 项符合条件的政策` : "填写企业信息后开始匹配"}>{matchResults.length ? <DataTable columns={[{ key: "name", header: "政策项目" }, { key: "level", header: "级别" }, { key: "type", header: "补贴类型" }, { key: "deadline", header: "截止日期" }, { key: "fit", header: "匹配度", sortable: true, cell: (row) => <StatusTag value={row.fit + " 分"} tone={row.fit >= 75 ? "success" : "warning"} /> }, { key: "basis", header: "匹配依据" }]} data={matchResults} /> : <div className="business-empty-hint"><Target /><span>{submitted ? "未找到符合条件的政策" : "匹配结果将在此显示"}</span></div>}</PageSection>
        </div>}
      </PageSection>
      <FormDialog open={addOpen} onOpenChange={setAddOpen} title="新增政策" description="添加后写入业务数据集。后端可用时将保存到本地数据库。" onSubmit={savePolicy}>
        <FormField label="政策项目名称" required><Input value={policyForm.name} onChange={(event) => setPolicyForm({ ...policyForm, name: event.target.value })} required /></FormField>
        <FormField label="组织部门" required><Input value={policyForm.org} onChange={(event) => setPolicyForm({ ...policyForm, org: event.target.value })} required /></FormField>
        <FormField label="政策级别"><select className="business-input" value={policyForm.level} onChange={(event) => setPolicyForm({ ...policyForm, level: event.target.value })}>{levels.map((item) => <option key={item}>{item}</option>)}</select></FormField>
        <FormField label="补贴类型"><select className="business-input" value={policyForm.type} onChange={(event) => setPolicyForm({ ...policyForm, type: event.target.value })}>{subsidyTypes.map((item) => <option key={item}>{item}</option>)}</select></FormField>
        <FormField label="所在地区"><select className="business-input" value={policyForm.district} onChange={(event) => setPolicyForm({ ...policyForm, district: event.target.value })}>{districts.map((item) => <option key={item}>{item}</option>)}</select></FormField>
        <FormField label="申报截止"><Input type="date" value={policyForm.deadline} onChange={(event) => setPolicyForm({ ...policyForm, deadline: event.target.value })} /></FormField>
      </FormDialog>
      <Dialog open={Boolean(poster)} onOpenChange={(open) => !open && setPoster(null)}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>政策海报预览</DialogTitle><DialogDescription>海报内容根据所选政策实时生成</DialogDescription></DialogHeader>{poster && <div className="policy-poster"><span>有数计划 · 政策服务</span><h2>{poster.name}</h2><p>{poster.org} · {poster.level} · {poster.district}</p><strong>{poster.type}</strong><small>申报截止 {poster.deadline || "以主管部门通知为准"}</small></div>}<Button onClick={() => { window.print(); }}>打印 / 保存海报</Button></DialogContent></Dialog>
    </div>
  );
}
