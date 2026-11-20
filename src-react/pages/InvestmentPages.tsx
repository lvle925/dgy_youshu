import { useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowRight, ArrowUpRight, Building2, Download, Filter, Layers3, MapPinned, Plus, RefreshCw, Search, Target } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChipFilter, matchesChipFilter, type ChipFilterGroup, type ChipFilterValue } from "@/../src/components/shared/ChipFilter";
import { DataTable, type DataColumn } from "@/../src/components/shared/DataTable";
import { FilterDrawer } from "@/../src/components/shared/FilterDrawer";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { StatBar } from "@/../src/components/shared/StatBar";
import { StatusTag } from "@/../src/components/shared/StatusTag";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { companies, clues, districts, industriesShort, industryChainTree, levels, mapMarkers, parks, policies, policyNotices, policyPublicList, policyTopics, subsidyTypes, supplyChainNodes, biddingRows, biddingRecommend, biddingCompanies, migrationEnterprises, visitRecords } from "../../src/data/mock.js";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { downloadCsv } from "@/lib/exportCsv";
import { FormDialog, FormField, NativeSelect, PageHeading, PageSection, SearchField, SectionTabs, StatusValue } from "@/pages/PagePrimitives";

type Row = Record<string, any> & { id: string | number };
const palette = ["#1652B8", "#147A4C", "#C8922E", "#5C8ED5", "#64748B"];
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

function readStoredIds(key: string) {
  try {
    const ids = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(ids) ? ids.map(String) : [];
  } catch {
    return [];
  }
}

export function PolicyPage() {
  const collection = useBusinessCollection<Row>({ key: "youshu-policies", seed: policies, apiCollection: "policies" });
  const [tab, setTab] = useState("project");
  const [filter, setFilter] = useState<ChipFilterValue>({});
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [policyForm, setPolicyForm] = useState({ name: "", org: "", level: "市级", type: "研发投入", district: "浦东新区", deadline: "" });
  const [matching, setMatching] = useState(false);
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
    { key: "name", header: "政策项目名称", sortable: true, cell: (row) => <button className="business-link" onClick={() => navigate(`/policy/detail/${row.id}`)}>{row.name}</button> },
    { key: "level", header: "级别", sortable: true },
    { key: "org", header: "组织部门" },
    { key: "stars", header: "推荐等级", sortable: true, cell: (row) => <span className="policy-stars" aria-label={`${row.stars} 星推荐`}>{"★".repeat(Number(row.stars) || 0)}<span>{"★".repeat(Math.max(0, 5 - (Number(row.stars) || 0)))}</span></span> },
    { key: "type", header: "补贴类型" },
    { key: "companies", header: "获批企业", sortable: true, cell: (row) => Number(row.companies || 0).toLocaleString() },
    { key: "deadline", header: "申报截止", sortable: true },
    { key: "status", header: "状态", cell: (row) => <StatusValue value={row.status ?? "申报中"} /> },
    { key: "poster", header: "操作", cell: (row) => <Button size="sm" variant="outline" onClick={() => setPoster(row)}>生成海报</Button> },
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
    setMatching(true);
    window.setTimeout(() => {
      setMatchResults([...collection.rows].filter((row) => row.level !== "国家级").slice(0, 6));
      setMatching(false);
      toast.success("政策匹配完成");
    }, 300);
  }
  return (
    <div className="business-page">
      <PageHeading title="政策管理" description="管理政策项目、通知文件、公示名单与申报匹配" source={collection.source} actions={<Button onClick={() => setAddOpen(true)}><Plus data-icon="inline-start" />新增政策</Button>} />
      <PageSection>
        <SectionTabs items={[{ key: "project", label: "政策项目", count: collection.rows.length }, { key: "notice", label: "通知文件", count: policyNotices.length }, { key: "public", label: "公示名单", count: policyPublicList.length }, { key: "topic", label: "项目课题", count: policyTopics.length }, { key: "match", label: "一键政策匹配" }]} value={tab} onChange={setTab} />
        {tab === "project" && <>
          <ChipFilter groups={policyGroups} value={filter} onChange={setFilter} onSearch={setAppliedKeyword} onReset={() => { setFilter({}); setKeyword(""); setAppliedKeyword(""); }} keywordPlaceholder="请输入政策项目名称" />
          <div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="搜索政策项目名称" /><Button variant="outline" onClick={() => setAppliedKeyword(keyword.trim())}><Search data-icon="inline-start" />查询</Button><Button variant="ghost" onClick={() => { setFilter({}); setKeyword(""); setAppliedKeyword(""); }}>重置</Button><Button variant="outline" onClick={() => downloadCsv("政策项目.csv", [{ header: "政策名称", value: (row: Row) => row.name }, { header: "级别", value: (row: Row) => row.level }, { header: "组织部门", value: (row: Row) => row.org }, { header: "补贴类型", value: (row: Row) => row.type }, { header: "地区", value: (row: Row) => row.district }, { header: "获批企业", value: (row: Row) => row.companies }, { header: "申报截止", value: (row: Row) => row.deadline }, { header: "状态", value: (row: Row) => row.status }], filtered)}><Download data-icon="inline-start" />导出</Button></div>
          <StatBar scope={Object.values(filter).some((items) => items.length) || appliedKeyword ? "当前筛选" : "全库口径"} items={[{ label: "政策项目", value: filtered.length, suffix: "条" }, { label: "申报中", value: filtered.filter((row) => row.status === "申报中").length, suffix: "项", tone: "success" }, { label: "覆盖企业", value: filtered.reduce((sum, row) => sum + Number(row.companies || 0), 0).toLocaleString(), suffix: "家" }, { label: "平均推荐等级", value: filtered.length ? (filtered.reduce((sum, row) => sum + Number(row.stars || 0), 0) / filtered.length).toFixed(1) : "0.0", suffix: "星" }, { label: "即将截止", value: filtered.filter((row) => row.deadline && row.deadline >= new Date().toISOString().slice(0, 10)).length, suffix: "项", tone: "gold" }]} />
          <DataTable columns={columns} data={filtered} detailTitle="政策信息" renderDetails={(row) => <PolicyDetails row={row} />} />
        </>}
        {tab === "notice" && <DataTable columns={[
          { key: "title", header: "通知标题", sortable: true }, { key: "org", header: "发布部门" }, { key: "type", header: "类型" }, { key: "date", header: "发布日期", sortable: true }, { key: "views", header: "浏览量", sortable: true },
        ]} data={policyNotices as Row[]} detailTitle="通知详情" />}
        {tab === "public" && <DataTable columns={[
          { key: "title", header: "名单名称" }, { key: "batch", header: "批次" }, { key: "org", header: "发布部门" }, { key: "date", header: "公示日期", sortable: true }, { key: "count", header: "企业数", sortable: true },
        ]} data={policyPublicList as Row[]} detailTitle="公示名单" />}
        {tab === "topic" && <DataTable columns={[
          { key: "title", header: "课题名称" }, { key: "org", header: "发布单位" }, { key: "field", header: "研究领域" }, { key: "budget", header: "课题经费" }, { key: "deadline", header: "申报截止", sortable: true }, { key: "status", header: "状态", cell: (row) => <StatusValue value={row.status} /> }, { key: "intent", header: "操作", cell: (row) => { const registered = intentIds.includes(String(row.id)); return <Button size="sm" variant="outline" onClick={() => { const next = registered ? intentIds.filter((id) => id !== String(row.id)) : [...intentIds, String(row.id)]; setIntentIds(next); localStorage.setItem("youshu-policy-intents", JSON.stringify(next)); toast.success(registered ? "已取消申报意向" : `已登记「${row.title}」申报意向`); }}>{registered ? "已登记意向" : "登记意向"}</Button>; } },
        ]} data={policyTopics as Row[]} />}
        {tab === "match" && <div className="policy-match-layout">
          <form className="policy-match-form" onSubmit={runMatch}><h2>企业政策匹配</h2><p>根据企业行业、规模和经营条件筛选可申报政策。</p><FormField label="企业名称" required><Input value={matchName} onChange={(event) => setMatchName(event.target.value)} placeholder="输入企业名称" /></FormField><FormField label="所属行业"><select className="business-input" defaultValue="人工智能"><option>人工智能</option>{industriesShort.map((item) => <option key={item}>{item}</option>)}</select></FormField><FormField label="企业规模"><select className="business-input" defaultValue="中型"><option>微型</option><option>小型</option><option>中型</option><option>大型</option></select></FormField><FormField label="所在区域"><select className="business-input" defaultValue="浦东新区">{districts.map((item) => <option key={item}>{item}</option>)}</select></FormField><Button disabled={matching} type="submit"><Target data-icon="inline-start" />{matching ? "匹配中…" : "开始匹配"}</Button></form>
          <PageSection title="匹配结果" description={matchResults.length ? `找到 ${matchResults.length} 项符合条件的政策` : "填写企业信息后开始匹配"}>{matchResults.length ? <DataTable columns={[{ key: "name", header: "政策项目" }, { key: "level", header: "级别" }, { key: "type", header: "补贴类型" }, { key: "deadline", header: "截止日期" }, { key: "fit", header: "匹配度", cell: (_row) => <StatusTag value="高" tone="success">高</StatusTag> }]} data={matchResults.map((row, index) => ({ ...row, fit: 96 - index * 7 }))} /> : <div className="business-empty-hint"><Target /><span>匹配结果将在此显示</span></div>}</PageSection>
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
      <Dialog open={Boolean(poster)} onOpenChange={(open) => !open && setPoster(null)}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>政策海报预览</DialogTitle><DialogDescription>海报内容根据所选政策实时生成</DialogDescription></DialogHeader>{poster && <div className="policy-poster"><span>有数计划 · 政策服务</span><h2>{poster.name}</h2><p>{poster.org} · {poster.level} · {poster.district}</p><strong>{poster.type}</strong><small>申报截止 {poster.deadline || "以主管部门通知为准"}</small></div>}<Button onClick={() => { setPoster(null); toast.success("海报已生成，可使用浏览器打印保存"); window.print(); }}>打印 / 保存海报</Button></DialogContent></Dialog>
    </div>
  );
}

function PolicyDetails({ row }: { row: Row }) {
  return <div className="business-detail-prose"><p>{row.content || "政策内容请以发布部门正式文件为准。"}</p><h3>申报条件</h3><ul>{(row.requirements ?? ["符合本市产业发展导向", "在本市依法登记并正常经营"]).map((item: string) => <li key={item}>{item}</li>)}</ul><h3>申报材料</h3><ul>{(row.materials ?? ["项目申请表", "企业资质证明材料"]).map((item: string) => <li key={item}>{item}</li>)}</ul></div>;
}

export function PolicyDetailPage() {
  const { id = "" } = useParams();
  const collection = useBusinessCollection<Row>({ key: "youshu-policies", seed: policies, apiCollection: "policies" });
  const row = collection.rows.find((item) => String(item.id) === id);
  const navigate = useNavigate();
  const [followed, setFollowed] = useState(() => readStoredIds("youshu-policy-follows").includes(id));
  if (!row) return <div className="business-page"><PageHeading title="政策详情" /><PageSection><div className="business-empty-hint">{collection.loading ? "正在加载政策" : "未找到该政策"}<Button variant="outline" onClick={() => navigate("/policy/index")}>返回政策列表</Button></div></PageSection></div>;
  return <div className="business-page"><PageHeading title="政策详情" description="查看政策适用范围、申报条件与材料" actions={<Button variant="outline" onClick={() => navigate("/policy/index")}>返回列表</Button>} /><PageSection title={row.name} description={`${row.org} · ${row.level} · ${row.district}`}><PolicyDetails row={row} /><div className="business-detail-actions"><StatusValue value={row.status} /><span>申报截止 {row.deadline}</span><Button onClick={() => { const current = readStoredIds("youshu-policy-follows"); const next = followed ? current.filter((item) => item !== id) : [...new Set([...current, id])]; localStorage.setItem("youshu-policy-follows", JSON.stringify(next)); setFollowed(!followed); toast.success(followed ? "已取消政策关注" : "已加入政策关注"); }}>{followed ? "已关注政策" : "关注政策"}</Button></div></PageSection></div>;
}

export function IndustryChartPage() {
  const [industry, setIndustry] = useState("人工智能");
  const [selected, setSelected] = useState<Row | null>(null);
  const layers: Row[] = (industryChainTree.children as unknown as Row[]).map((layer, index) => ({ ...layer, id: `industry-layer-${index}` }));
  const distribution = [
    { name: "大型", value: 68 }, { name: "中型", value: 42 }, { name: "小型", value: 56 }, { name: "微型", value: 28 },
  ];
  const districtsData = [{ name: "浦东", value: 680 }, { name: "徐汇", value: 420 }, { name: "闵行", value: 310 }, { name: "杨浦", value: 260 }, { name: "嘉定", value: 210 }, { name: "松江", value: 186 }];
  return <div className="business-page">
    <PageHeading title="产业图谱" description="沿产业链查看上中下游环节、代表企业与区域分布" actions={<><Button variant="outline" onClick={() => toast.success("图谱数据已刷新") }><RefreshCw data-icon="inline-start" />刷新数据</Button><Button variant="outline" onClick={() => toast.success("图谱导出已准备")}><Download data-icon="inline-start" />导出图谱</Button></>} />
    <div className="business-metric-grid"><MetricCard title="产业链企业总数" value="2,386" description="覆盖 3 个产业层级" icon={<Building2 />} /><MetricCard title="链主企业" value="32" description="带动上下游协同" variant="surface" /><MetricCard title="专精特新企业" value="186" description="重点创新企业" variant="surface" /><MetricCard title="近一年新增" value="264" description="企业节点增量" variant="surface" delta={12.4} /></div>
    <PageSection title="产业链结构" description={`${industry}产业链 · 点击节点查看企业明细`}>
      <SectionTabs items={["人工智能", "生物医药", "集成电路", "新能源汽车", "高端装备"].map((name) => ({ key: name, label: name }))} value={industry} onChange={setIndustry} />
      <div className="industry-layers">{layers.map((layer, index) => <section className="industry-layer" key={layer.name}><div className="industry-layer-heading"><span>{index + 1}</span><h3>{layer.name}</h3><small>{layer.children.length} 个产业环节</small></div><div className="industry-node-grid">{(layer.children as Row[]).map((node) => <button key={node.name} type="button" className="industry-node" onClick={() => setSelected({ ...node, layer: layer.name })}><strong>{node.name}</strong><span>{node.count} 家企业</span><div className="industry-node-meter"><i style={{ width: `${Math.max(14, Math.min(100, Number(node.count) / 2.2))}%` }} /></div><small>{(node.companies as string[]).slice(0, 2).join(" · ")}</small></button>)}</div>{index < layers.length - 1 && <div className="industry-flow"><ArrowDown /></div>}</section>)}</div>
    </PageSection>
    <div className="business-chart-grid"><PageSection title="企业规模分布"><div className="business-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distribution} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2}>{distribution.map((entry, index) => <Cell key={entry.name} fill={palette[index % palette.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></PageSection><PageSection title="各区产业链企业分布"><div className="business-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={districtsData} margin={{ left: 2, right: 12, top: 12, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7ebf0" /><XAxis dataKey="name" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="value" name="企业数" radius={[4, 4, 0, 0]}>{districtsData.map((entry, index) => <Cell key={entry.name} fill={palette[index % palette.length]} />)}</Bar></BarChart></ResponsiveContainer></div></PageSection></div>
    <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><SheetContent side="right" className="business-detail-sheet"><SheetHeader><SheetTitle>{selected?.name} · 企业明细</SheetTitle><SheetDescription>{selected?.layer} · 共 {selected?.count} 家企业</SheetDescription></SheetHeader>{selected && <div className="business-company-list">{(selected.companies as string[]).map((name, index) => <div key={name} className="business-company-item"><span>{index + 1}</span><div><strong>{name}</strong><small>{selected.name} · {index % 2 ? "高成长企业" : "链上重点企业"}</small></div><Button size="sm" variant="ghost" onClick={() => toast.info(`已打开 ${name} 企业信息`)}>查看</Button></div>)}</div>}</SheetContent></Sheet>
  </div>;
}

export function IndustrySupplyPage() {
  const data = useBusinessCollection<Row>({ key: "youshu-supply-chain", seed: supplyChainNodes });
  const [keyword, setKeyword] = useState("");
  const [chain, setChain] = useState("");
  const [role, setRole] = useState("");
  const [detail, setDetail] = useState<Row | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", industry: "生物医药", level: "配套企业", products: "", park: String(supplyChainNodes[0]?.park ?? "") });
  const filtered = useMemo(() => data.rows.filter((row) => (!keyword || `${row.name} ${row.products}`.includes(keyword)) && (!chain || row.industry === chain) && (!role || row.level === role)), [data.rows, keyword, chain, role]);
  const columns: DataColumn<Row>[] = [
    { key: "name", header: "企业名称", sortable: true, cell: (row) => <button className="business-link" onClick={() => setDetail(row)}>{row.name}</button> }, { key: "industry", header: "所属产业链" }, { key: "level", header: "供应链角色", cell: (row) => <StatusValue value={row.level} /> }, { key: "products", header: "主营产品" }, { key: "partners", header: "合作伙伴", sortable: true }, { key: "park", header: "所属园区" },
  ];
  async function addCompany(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!form.name.trim()) return toast.warning("请填写企业名称"); try { await data.createRecord(form as Omit<Row, "id">); setAddOpen(false); setForm({ ...form, name: "", products: "" }); toast.success("供应链企业已新增"); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "新增失败"); } }
  return <div className="business-page"><PageHeading title="供应链" description="检索链主、核心供应商与配套企业，查看上下游协同关系" source={data.source} actions={<Button onClick={() => setAddOpen(true)}><Plus data-icon="inline-start" />新增企业</Button>} /><StatBar items={[{ label: "供应链企业", value: data.rows.length, suffix: "家" }, { label: "链主企业", value: data.rows.filter((row) => row.level === "链主企业").length, suffix: "家" }, { label: "核心供应商", value: data.rows.filter((row) => row.level === "核心供应商").length, suffix: "家" }, { label: "本地配套率", value: "68.5", suffix: "%", tone: "success" }, { label: "供需对接成功", value: "342", suffix: "次", tone: "gold" }]} /><PageSection title="供应链企业列表" description={`共 ${filtered.length} 家企业`}><div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="搜索企业名称 / 产品" /><NativeSelect label="所属产业链" value={chain} onChange={setChain} options={[...new Set(data.rows.map((row) => row.industry))]} /><NativeSelect label="企业类型" value={role} onChange={setRole} options={["链主企业", "核心供应商", "配套企业"]} /></div><DataTable columns={columns} data={filtered} openRowDetails={false} onRowClick={setDetail} detailTitle="供应链企业" /></PageSection>
    <FormDialog open={addOpen} onOpenChange={setAddOpen} title="新增供应链企业" onSubmit={addCompany}><FormField label="企业名称" required><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></FormField><FormField label="所属产业链"><select className="business-input" value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })}>{industriesShort.map((item) => <option key={item}>{item}</option>)}</select></FormField><FormField label="企业类型"><select className="business-input" value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}>{["链主企业", "核心供应商", "配套企业"].map((item) => <option key={item}>{item}</option>)}</select></FormField><FormField label="主营产品"><Input value={form.products} onChange={(event) => setForm({ ...form, products: event.target.value })} /></FormField></FormDialog>
    <Sheet open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}><SheetContent side="right" className="business-detail-sheet"><SheetHeader><SheetTitle>{detail?.name}</SheetTitle><SheetDescription>供应链上下游关系</SheetDescription></SheetHeader>{detail && <><div className="business-chip-row"><StatusValue value={detail.level} /><StatusValue value={detail.industry} /><span className="business-muted">{detail.park}</span></div><div className="supply-flow"><div><small>上游供应</small><span>原材料供应商</span><span>技术服务伙伴</span><span>设备合作企业</span></div><ArrowRight /><div><small>当前企业</small><strong>{detail.name}</strong><p>{detail.products}</p></div><ArrowRight /><div><small>下游需求</small><span>产业链客户</span><span>应用场景伙伴</span><span>联合研发单位</span></div></div><p className="business-muted">登记合作伙伴 {detail.partners ?? 0} 家，可继续维护上下游企业关系。</p></>}</SheetContent></Sheet>
  </div>;
}

export function ParksBuildingsPage() {
  const data = useBusinessCollection<Row>({ key: "youshu-parks-buildings", seed: parks });
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [district, setDistrict] = useState("");
  const [type, setType] = useState("");
  const [view, setView] = useState<"card" | "table">("card");
  const [detail, setDetail] = useState<Row | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", district: "浦东新区", type: "特色产业园", address: "", area: "", buildings: "", enterprises: "", occupancy: "" });
  const filtered = useMemo(() => data.rows.filter((row) => (!keyword || String(row.name).includes(keyword)) && (!district || row.district === district) && (!type || row.type === type)), [data.rows, keyword, district, type]);
  async function addPark(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!form.name.trim()) return toast.warning("请填写载体名称"); try { await data.createRecord({ ...form, buildings: Number(form.buildings) || 0, enterprises: Number(form.enterprises) || 0, occupancy: Number(form.occupancy) || 0 } as Omit<Row, "id">); setAddOpen(false); setForm({ ...form, name: "", address: "", area: "", buildings: "", enterprises: "", occupancy: "" }); toast.success("园区载体已保存"); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "保存失败"); } }
  const columns: DataColumn<Row>[] = [{ key: "name", header: "载体名称", sortable: true }, { key: "district", header: "所在区域" }, { key: "type", header: "载体类型" }, { key: "buildings", header: "楼宇数", sortable: true }, { key: "area", header: "建筑面积" }, { key: "enterprises", header: "入驻企业", sortable: true }, { key: "occupancy", header: "入驻率", cell: (row) => `${row.occupancy}%` }, { key: "manager", header: "运营负责人" }];
  return <div className="business-page"><PageHeading title="园区楼宇" description="检索招商载体与园区楼宇，查看空间规模和入驻情况" source={data.source} actions={<Button onClick={() => setAddOpen(true)}><Plus data-icon="inline-start" />新增园区载体</Button>} /><StatBar scope="当前筛选" items={[{ label: "园区载体", value: filtered.length, suffix: "处" }, { label: "楼宇总数", value: filtered.reduce((sum, row) => sum + Number(row.buildings || 0), 0), suffix: "栋" }, { label: "入驻企业", value: filtered.reduce((sum, row) => sum + Number(row.enterprises || 0), 0).toLocaleString(), suffix: "家" }, { label: "平均入驻率", value: filtered.length ? (filtered.reduce((sum, row) => sum + Number(row.occupancy || 0), 0) / filtered.length).toFixed(1) : "0.0", suffix: "%", tone: "success" }]} /><PageSection title="载体清单" description="按区域、类型与关键词查找可招商空间"><div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} /><NativeSelect label="所在区域" value={district} onChange={setDistrict} options={districts} /><NativeSelect label="载体类型" value={type} onChange={setType} options={["特色产业园", "综合园区", "产业基地", "开发区"]} /><div className="business-view-switch"><Button size="sm" variant={view === "card" ? "default" : "outline"} onClick={() => setView("card")}>卡片</Button><Button size="sm" variant={view === "table" ? "default" : "outline"} onClick={() => setView("table")}>列表</Button></div></div>{view === "table" ? <DataTable columns={columns} data={filtered} openRowDetails={false} onRowClick={setDetail} detailTitle="载体详情" /> : <div className="park-card-grid">{filtered.map((park) => <button key={park.id} type="button" className="park-card" onClick={() => setDetail(park)}><div className="park-card-top"><span className="park-card-icon"><Building2 /></span><StatusValue value={park.type} /></div><strong>{park.name}</strong><span className="park-card-address">{park.district} · {park.address}</span><div className="park-card-metrics"><span><b>{park.buildings}</b>栋楼宇</span><span><b>{park.enterprises}</b>家企业</span><span><b>{park.occupancy}%</b>入驻率</span></div><div className="park-occupancy"><i style={{ width: `${Math.min(100, Number(park.occupancy))}%` }} /></div></button>)}</div>}</PageSection>
    <FormDialog open={addOpen} onOpenChange={setAddOpen} title="新增园区载体" onSubmit={addPark}><FormField label="载体名称" required><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></FormField><FormField label="所在区域"><select className="business-input" value={form.district} onChange={(event) => setForm({ ...form, district: event.target.value })}>{districts.map((item) => <option key={item}>{item}</option>)}</select></FormField><FormField label="载体类型"><select className="business-input" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>{["特色产业园", "综合园区", "产业基地", "开发区"].map((item) => <option key={item}>{item}</option>)}</select></FormField><FormField label="地址"><Input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></FormField><FormField label="建筑面积"><Input value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })} placeholder="例如 12.6 万㎡" /></FormField><FormField label="楼宇数量"><Input type="number" min="0" value={form.buildings} onChange={(event) => setForm({ ...form, buildings: event.target.value })} /></FormField><FormField label="入驻企业"><Input type="number" min="0" value={form.enterprises} onChange={(event) => setForm({ ...form, enterprises: event.target.value })} /></FormField><FormField label="入驻率 %"><Input type="number" min="0" max="100" value={form.occupancy} onChange={(event) => setForm({ ...form, occupancy: event.target.value })} /></FormField></FormDialog>
    <Sheet open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}><SheetContent side="right" className="business-detail-sheet"><SheetHeader><SheetTitle>{detail?.name}</SheetTitle><SheetDescription>{detail?.district} · {detail?.type}</SheetDescription></SheetHeader>{detail && <><p className="business-detail-intro">{detail.intro || "园区载体信息"}</p><div className="business-metric-grid compact"><MetricCard title="建筑面积" value={detail.area || "待补充"} /><MetricCard title="楼宇数量" value={detail.buildings ?? "—"} /><MetricCard title="入驻企业" value={detail.enterprises ?? "—"} /><MetricCard title="入驻率" value={`${detail.occupancy ?? 0}%`} /></div><p className="business-muted">{detail.address} · 运营负责人 {detail.manager || "待分配"}</p><Button variant="outline" onClick={() => { const id = detail.id; setDetail(null); navigate(`/park/detail/${id}`); }}>查看园区详情</Button></>}</SheetContent></Sheet>
  </div>;
}

export function BusinessMapPage() {
  const leads = useBusinessCollection<Row>({ key: "youshu-clues", seed: clues, apiCollection: "clues" });
  const [keyword, setKeyword] = useState("");
  const [district, setDistrict] = useState("");
  const [industry, setIndustry] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const markers = mapMarkers as Row[];
  const filtered = markers.filter((item) => (!keyword || `${item.name} ${item.address}`.includes(keyword)) && (!district || item.district === district) && (!industry || item.industry === industry));
  async function addFollowUp() {
    if (!selected) return;
    try {
      await leads.createRecord({
        company: selected.name,
        intent: "园区空间与招商需求跟进",
        region: selected.district || "上海市",
        industry: selected.industry || "待确认",
        level: "B",
        source: "商机地图",
        contact: "待补充",
        phone: "待补充",
        date: new Date().toISOString().slice(0, 10),
        status: "待跟进",
        park: selected.name,
        score: 75,
        desc: `从商机地图创建，位置：${selected.address || selected.district || "待确认"}`,
      });
      toast.success("已加入项目线索");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "加入项目线索失败");
    }
  }
  return <div className="business-page business-map-page"><PageHeading title="商机地图" description="按区域和产业查找园区载体与潜在招商空间" actions={<Button variant="outline" onClick={() => { setKeyword(""); setDistrict(""); setIndustry(""); setSelected(null); toast.success("地图视野已重置"); }}><RefreshCw data-icon="inline-start" />重置视野</Button>} /><div className="business-map-layout"><PageSection title="园区与商机" description={`${filtered.length} 个位置`}><div className="business-map-filters"><SearchField value={keyword} onChange={setKeyword} placeholder="搜索园区或地址" /><NativeSelect label="区域" value={district} onChange={setDistrict} options={districts} /><NativeSelect label="产业" value={industry} onChange={setIndustry} options={industriesShort} /></div><div className="map-result-list">{filtered.map((item) => <button key={item.id} type="button" className={selected?.id === item.id ? "is-selected" : ""} onClick={() => setSelected(item)}><span className="map-marker-dot"><MapPinned /></span><span><strong>{item.name}</strong><small>{item.district} · {item.industry}</small></span><ArrowRight /></button>)}</div></PageSection><div className="business-map-canvas" role="img" aria-label="上海市园区和招商商机分布示意图"><div className="map-grid-lines" /><div className="map-river" /><span className="map-label map-label--center">上海市</span>{filtered.map((item, index) => <button key={item.id} type="button" className={`map-pin ${selected?.id === item.id ? "is-selected" : ""}`} style={{ left: `${Number(item.x) || 20 + ((index * 23) % 70)}%`, top: `${Number(item.y) || 16 + ((index * 31) % 64)}%` }} onClick={() => setSelected(item)} title={item.name}><MapPinned /><span>{item.name}</span></button>)}<div className="map-legend"><span><i className="legend-blue" />园区载体</span><span><i className="legend-gold" />重点商机</span></div></div></div><Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><SheetContent side="right" className="business-detail-sheet"><SheetHeader><SheetTitle>{selected?.name}</SheetTitle><SheetDescription>{selected?.district} · {selected?.industry}</SheetDescription></SheetHeader>{selected && <><div className="business-detail-intro">{selected.address || "上海市产业园区"}</div><div className="business-chip-row"><StatusValue value={selected.type || "产业园区"} /><StatusValue value={selected.industry} /></div><p className="business-muted">该位置关联 {selected.enterprises ?? selected.count ?? "多家"} 家企业，可进一步查看空间情况或创建招商跟进。</p><Button onClick={() => void addFollowUp()}><Target data-icon="inline-start" />加入跟进</Button></>}</SheetContent></Sheet></div>;
}

export function CompanySearchPage() {
  const [keyword, setKeyword] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [compare, setCompare] = useState<Row[]>([]);
  const navigate = useNavigate();
  const groups = [
    { key: "industry", label: "所属行业", options: industriesShort },
    { key: "scale", label: "企业规模", options: ["微型", "小型", "中型", "大型", "超大型"] },
    { key: "district", label: "所在区域", options: districts },
    { key: "tags", label: "企业标签", options: ["高新技术企业", "专精特新", "上市企业", "独角兽", "创新型企业"] },
  ];
  const rows = (companies as Row[]).filter((row) => (!keyword || `${row.name} ${row.code}`.includes(keyword)) && groups.every((group) => !filters[group.key]?.length || filters[group.key].some((item) => (Array.isArray(row[group.key]) ? row[group.key] : [row[group.key]]).includes(item))));
  const columns: DataColumn<Row>[] = [{ key: "name", header: "企业名称", sortable: true, cell: (row) => <button className="business-link" onClick={() => navigate(`/subsidy/company/${row.id}`)}>{row.name}</button> }, { key: "industry", header: "所属行业" }, { key: "scale", header: "企业规模" }, { key: "district", header: "所在区域" }, { key: "socialSecurity", header: "社保人数", sortable: true }, { key: "regCapital", header: "注册资本" }, { key: "tags", header: "企业标签", cell: (row) => <span>{(row.tags ?? []).join("、")}</span> }, { key: "compare", header: "对比", cell: (row) => <Button size="sm" variant="outline" onClick={() => toggleCompare(row)}>{compare.some((item) => item.id === row.id) ? "已加入" : "加入对比"}</Button> }];
  function toggleCompare(row: Row) {
    if (compare.some((item) => item.id === row.id)) {
      setCompare((current) => current.filter((item) => item.id !== row.id));
      return;
    }
    if (compare.length >= 4) {
      toast.warning("最多对比 4 家企业");
      return;
    }
    setCompare((current) => [...current, row]);
  }
  return <div className="business-page"><PageHeading title="企业查询" description="搜索企业并查看工商概况、产业标签和园区分布" actions={<Button variant="outline" onClick={() => setDrawerOpen(true)}><Filter data-icon="inline-start" />高级筛选</Button>} /><div className="business-metric-grid"><MetricCard title="企业总量" value="3,105" description="当前地区企业库" icon={<Building2 />} /><MetricCard title="高新技术企业" value="862" description="重点科技企业" variant="surface" /><MetricCard title="专精特新企业" value="426" description="创新型企业" variant="surface" /><MetricCard title="近一年新增" value="186" description="企业注册与迁入" variant="surface" delta={8.6} /></div><PageSection title="企业名录" description={`找到 ${rows.length} 家企业`}><div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="企业名称或统一社会信用代码" /><Button variant="outline" onClick={() => setDrawerOpen(true)}><Filter data-icon="inline-start" />高级筛选</Button>{compare.length > 0 && <Button onClick={() => document.getElementById("company-compare")?.scrollIntoView({ behavior: "smooth" })}>对比 {compare.length} 家</Button>}</div><DataTable columns={columns} data={rows} detailTitle="企业摘要" renderDetails={(row) => <CompanySummary row={row} />} /></PageSection>{compare.length > 0 && <PageSection title="企业对比" description="最多选择 4 家企业进行横向比较"><div id="company-compare" className="compare-table"><div>企业名称</div>{compare.map((row) => <strong key={row.id}>{row.shortName || row.name}</strong>)}<div>所属行业</div>{compare.map((row) => <span key={row.id}>{row.industry}</span>)}<div>企业规模</div>{compare.map((row) => <span key={row.id}>{row.scale}</span>)}<div>社保人数</div>{compare.map((row) => <span key={row.id}>{row.socialSecurity} 人</span>)}<div>注册资本</div>{compare.map((row) => <span key={row.id}>{row.regCapital}</span>)}<div>园区</div>{compare.map((row) => <span key={row.id}>{row.park}</span>)}</div><Button variant="outline" onClick={() => setCompare([])}>清空对比</Button></PageSection>}<FilterDrawer open={drawerOpen} onOpenChange={setDrawerOpen} title="企业高级筛选" groups={groups} value={filters} onChange={setFilters} onQuery={() => setDrawerOpen(false)} onReset={() => setFilters({})} /></div>;
}

function CompanySummary({ row }: { row: Row }) {
  return <div className="business-company-summary"><div className="business-company-mark">{String(row.name).slice(0, 1)}</div><div><h3>{row.name}</h3><p>{row.industry} · {row.scale}企业 · {row.district}</p></div><dl><div><dt>统一社会信用代码</dt><dd>{row.code}</dd></div><div><dt>注册资本</dt><dd>{row.regCapital}</dd></div><div><dt>社保人数</dt><dd>{row.socialSecurity} 人</dd></div><div><dt>所属园区</dt><dd>{row.park}</dd></div><div><dt>企业标签</dt><dd>{(row.tags ?? []).join("、")}</dd></div></dl></div>;
}

export function CompanyDetailPage() {
  const { id = "" } = useParams();
  const company = (companies as Row[]).find((item) => String(item.id) === id) ?? companies[0] as Row;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const relevantPolicies = (policies as Row[]).filter((item) => String(item.industry).includes(company.industry) || item.name.includes(company.industry)).slice(0, 5);
  const risk = (migrationEnterprises as Row[]).find((item) => item.name === company.name);
  const services = (visitRecords as Row[]).filter((item) => item.company === company.name);
  const changeRows = [
    { id: `${company.id}-change-1`, date: company.registerDate, type: "企业登记信息", detail: "工商登记信息已同步至企业档案", source: "企业数据服务" },
    { id: `${company.id}-change-2`, date: company.settleDate, type: "园区入驻", detail: `入驻${company.park}`, source: "园区运营" },
    { id: `${company.id}-change-3`, date: "2026-08-12", type: "人员规模变化", detail: `当前社保人数 ${company.socialSecurity} 人`, source: "企业画像" },
  ];
  return <div className="business-page"><PageHeading title="企业详情" description="企业全景档案与产业服务记录" actions={<><Button variant="outline" onClick={() => navigate("/subsidy/index")}>返回企业查询</Button><Button onClick={() => navigate("/myCampus/visitManage/index", { state: { company: company.name } })}>创建走访工单</Button></>} /><PageSection title={company.name} description={`${company.industry} · ${company.scale}企业`}><SectionTabs items={[{ key: "overview", label: "企业概况" }, { key: "changes", label: "工商变更" }, { key: "policy", label: "政策获批" }, { key: "risk", label: "经营风险" }, { key: "service", label: "服务记录" }]} value={activeTab} onChange={setActiveTab} />{activeTab === "overview" && <CompanySummary row={company} />}{activeTab === "changes" && <DataTable columns={[{ key: "date", header: "日期", sortable: true }, { key: "type", header: "变更事项" }, { key: "detail", header: "变更内容" }, { key: "source", header: "数据来源" }]} data={changeRows} />}{activeTab === "policy" && <DataTable columns={[{ key: "name", header: "政策名称" }, { key: "level", header: "级别" }, { key: "type", header: "补贴类型" }, { key: "deadline", header: "申报截止" }, { key: "status", header: "状态", cell: (row) => <StatusValue value={row.status} /> }]} data={relevantPolicies} emptyText="暂无关联政策" />}{activeTab === "risk" && (risk ? <div className="business-risk-summary"><StatusValue value={risk.risk} /><strong>{risk.score} 分</strong><p>{risk.drive} · 推力信号 {risk.push} · 拉力信号 {risk.pull}</p><Button variant="outline" onClick={() => navigate("/myCampus/migrationWarning/index")}>查看迁移预警</Button></div> : <div className="business-empty-hint"><StatusTag value="安全" /><span>当前演示档案没有匹配到高风险企业</span></div>)}{activeTab === "service" && <DataTable columns={[{ key: "title", header: "服务主题" }, { key: "owner", header: "服务专员" }, { key: "date", header: "服务日期", sortable: true }, { key: "result", header: "服务结果" }, { key: "duration", header: "时长" }]} data={services} emptyText="暂无线下走访记录" />}</PageSection><div className="business-metric-grid"><MetricCard title="企业评分" value={`${company.score ?? 86} 分`} description="综合发展潜力" icon={<Target />} /><MetricCard title="留存率" value={`${company.retentionRate ?? "98.5"}%`} description="园区企业留存情况" /><MetricCard title="入驻日期" value={company.settleDate} description="园区入驻时间" /><MetricCard title="发展趋势" value={company.growth ?? "保持稳定"} description="近月经营变化" /></div><PageSection title="产业服务画像" description="此演示档案由本地企业数据生成"><p className="business-muted">企业已关联政策申报、园区服务、招聘及知识产权等画像维度。完整工商、股权与司法数据需接入外部企业数据服务。</p><div className="business-chip-row">{(company.tags ?? []).map((tag: string) => <StatusTag key={tag} value={tag} />)}</div></PageSection></div>;
}

export function ParkDetailPage() {
  const { id = "" } = useParams();
  const park = (parks as Row[]).find((item) => String(item.id) === id) ?? parks[0] as Row;
  const navigate = useNavigate();
  return <div className="business-page"><PageHeading title="园区详情" description="空间载体、运营概况与企业服务信息" actions={<Button variant="outline" onClick={() => navigate("/parksBuildings/index")}>返回园区楼宇</Button>} /><div className="business-metric-grid"><MetricCard title="建筑面积" value={park.area} description="园区空间规模" /><MetricCard title="楼宇数量" value={park.buildings} description="可持续维护" /><MetricCard title="入驻企业" value={park.enterprises} description="园区经营主体" /><MetricCard title="入驻率" value={`${park.occupancy}%`} description="当前空间利用率" /></div><PageSection title={park.name} description={`${park.district} · ${park.address}`}><p>{park.intro}</p><div className="business-contact-grid"><div><span>运营负责人</span><strong>{park.manager}</strong></div><div><span>服务电话</span><strong>{park.phone}</strong></div><div><span>园区类型</span><strong>{park.type}</strong></div><div><span>产业方向</span><strong>{industriesShort.slice(0, 3).join("、")}</strong></div></div></PageSection><PageSection title="园区运营" description="演示数据暂未拆分楼宇与企业成员明细"><Button onClick={() => navigate("/myCampus/campusAdmin/index")}>打开园区管理</Button></PageSection></div>;
}

export function BiddingPage() {
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState("");
  const rows = (biddingRows as Row[]).filter((row) => (!keyword || `${row.title} ${row.buyer}`.includes(keyword)) && (!type || row.type === type));
  const companyRows = (biddingCompanies as unknown as Row[]).map((row, index) => ({ ...row, id: `bid-company-${index}` }));
  return <div className="business-page"><PageHeading title="招投标查询" description="跟踪园区建设、产业服务和重点企业采购机会" /><div className="business-metric-grid"><MetricCard title="近期公告" value={biddingRows.length} description="近 30 天发布" icon={<Layers3 />} /><MetricCard title="报名中" value={biddingRows.filter((row) => row.status === "报名中").length} description="仍可参与" /><MetricCard title="重点推荐" value={biddingRecommend.length} description="与园区业务匹配" /><MetricCard title="活跃中标方" value={biddingCompanies.length} description="本地供应链企业" /></div><PageSection title="招投标公告" description={`共 ${rows.length} 条`}><div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="搜索项目名称或采购方" /><NativeSelect label="公告类型" value={type} onChange={setType} options={["招标公告", "中标公告"]} /></div><DataTable columns={[{ key: "title", header: "项目名称", sortable: true }, { key: "type", header: "公告类型", cell: (row) => <StatusValue value={row.type} /> }, { key: "buyer", header: "采购单位" }, { key: "budget", header: "预算金额", sortable: true }, { key: "region", header: "项目地区" }, { key: "date", header: "发布日期", sortable: true }, { key: "deadline", header: "投标截止" }, { key: "status", header: "状态", cell: (row) => <StatusValue value={row.status} /> }]} data={rows} detailTitle="招投标项目" /></PageSection><div className="business-chart-grid"><PageSection title="匹配推荐"><div className="recommend-list">{biddingRecommend.map((row) => <div key={row.id}><span><b>{row.match}</b> 分</span><div><strong>{row.title}</strong><small>{row.buyer} · {row.budget}</small></div><Button size="sm" variant="outline" onClick={() => toast.success("已关注该招标机会")}>关注</Button></div>)}</div></PageSection><PageSection title="活跃中标企业"><DataTable columns={[{ key: "name", header: "企业名称" }, { key: "industry", header: "所属行业" }, { key: "count", header: "中标次数", sortable: true }]} data={companyRows} /></PageSection></div></div>;
}
