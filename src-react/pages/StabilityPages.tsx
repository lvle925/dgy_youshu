import { useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, AlertTriangle, ArrowUpRight, Building2, CalendarDays, CheckCircle2, Download, FilePlus2, Filter, Plus, Search, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type DataColumn } from "@/../src/components/shared/DataTable";
import { FilterDrawer } from "@/../src/components/shared/FilterDrawer";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { StatBar } from "@/../src/components/shared/StatBar";
import { StatusTag } from "@/../src/components/shared/StatusTag";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { archiveStats, campusList, companies, districts, guaranteeRecords, migrationEnterprises, migrationStats, panoramicStats, parks, platformUsers, visitOrders, visitRecords } from "../../src/data/mock.js";
import { api } from "../../src/api.js";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { FormDialog, FormField, NativeSelect, PageHeading, PageSection, SearchField, SectionTabs, StatusValue } from "@/pages/PagePrimitives";

type Row = Record<string, any> & { id: string | number };
const chartPalette = ["#1652B8", "#147A4C", "#C8922E", "#5C8ED5", "#64748B"];

export function PanoramicInsightPage() {
  const [district, setDistrict] = useState("");
  const [period, setPeriod] = useState("近 8 个月");
  const stats = [
    { label: "入驻企业总数", value: panoramicStats.enterprises.toLocaleString(), delta: "+1 家本月" },
    { label: "园区载体", value: panoramicStats.parks, delta: "268 栋楼宇" },
    { label: "在跟商机线索", value: panoramicStats.clues.toLocaleString(), delta: "+8.6% 较上月" },
    { label: "迁移预警企业", value: panoramicStats.migration, delta: "高风险 18 家" },
    { label: "园区总营收", value: panoramicStats.revenue, delta: "+12.4% 同比" },
    { label: "企业留存率", value: panoramicStats.settleRate, delta: "当前年度" },
  ];
  const parksView = (campusList as Row[]).filter((row) => !district || row.district === district);
  const columns: DataColumn<Row>[] = [{ key: "name", header: "园区名称" }, { key: "buildings", header: "楼宇数", sortable: true }, { key: "enterprises", header: "入驻企业", sortable: true }, { key: "area", header: "载体面积" }, { key: "occupancy", header: "入驻率", sortable: true, cell: (row) => `${row.occupancy}%` }, { key: "status", header: "运营状态", cell: (row) => <StatusValue value={row.status} /> }];
  const trend = [{ month: "4月", incoming: 18, outgoing: 9 }, { month: "5月", incoming: 24, outgoing: 7 }, { month: "6月", incoming: 21, outgoing: 11 }, { month: "7月", incoming: 32, outgoing: 6 }, { month: "8月", incoming: 28, outgoing: 8 }, { month: "9月", incoming: 35, outgoing: 5 }, { month: "10月", incoming: 41, outgoing: 4 }, { month: "11月", incoming: 26, outgoing: 3 }];
  return <div className="business-page"><PageHeading title="全景洞察" description="从企业、园区、招商线索和服务履约观察区域产业运行" actions={<><label className="business-native-select"><span>统计周期</span><select value={period} onChange={(event) => setPeriod(event.target.value)}><option>近 8 个月</option><option>近 12 个月</option><option>本年度</option></select></label><NativeSelect label="所在区域" value={district} onChange={setDistrict} options={districts} /></>} /><div className="business-metric-grid six">{stats.map((item, index) => <MetricCard key={item.label} title={item.label} value={item.value} description={item.delta} variant={index === 0 ? "gradient" : "surface"} />)}</div><div className="business-chart-grid"><PageSection title="企业迁入迁出趋势" description={`${period} · 迁入、迁出与区域企业增量`}><div className="business-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={trend}><CartesianGrid vertical={false} stroke="#e7ebf0" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="incoming" name="迁入" stroke="#1652B8" strokeWidth={2} /><Line type="monotone" dataKey="outgoing" name="迁出" stroke="#C8922E" strokeWidth={2} /></LineChart></ResponsiveContainer></div></PageSection><PageSection title="产业结构分布"><div className="business-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{ name: "集成电路", value: 862 }, { name: "生物医药", value: 724 }, { name: "人工智能", value: 586 }, { name: "新能源", value: 468 }, { name: "高端装备", value: 465 }]} dataKey="value" innerRadius={58} outerRadius={92}>{chartPalette.map((color) => <Cell key={color} fill={color} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></PageSection></div><PageSection title="园区运行监测" description="按入驻企业规模查看重点园区"><div className="business-toolbar"><NativeSelect label="区域" value={district} onChange={setDistrict} options={districts} /></div><DataTable columns={columns} data={parksView} detailTitle="园区运行概况" /></PageSection></div>;
}

export function CampusAdminPage() {
  const data = useBusinessCollection<Row>({ key: "youshu-campus-list", seed: campusList, apiCollection: "campusList" });
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [district, setDistrict] = useState("");
  const [status, setStatus] = useState("");
  const [view, setView] = useState("card");
  const [selected, setSelected] = useState<Row | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: "", district: "浦东新区", buildings: "", enterprises: "", area: "", occupancy: "", manager: "顾龙飞", status: "运营中" });
  const filtered = data.rows.filter((row) => (!keyword || String(row.name).includes(keyword)) && (!district || row.district === district) && (!status || row.status === status));
  const columns: DataColumn<Row>[] = [{ key: "name", header: "园区名称", sortable: true }, { key: "district", header: "区域" }, { key: "buildings", header: "楼宇数", sortable: true }, { key: "enterprises", header: "入驻企业", sortable: true }, { key: "area", header: "载体面积" }, { key: "occupancy", header: "入驻率", sortable: true, cell: (row) => `${row.occupancy}%` }, { key: "manager", header: "负责人" }, { key: "status", header: "状态", cell: (row) => <StatusValue value={row.status} /> }, { key: "action", header: "操作", cell: (row) => <Button size="sm" variant="outline" onClick={() => openEdit(row)}>编辑</Button> }];
  function openEdit(row?: Row) { setEditing(row ?? null); setForm(row ? { name: row.name, district: row.district, buildings: String(row.buildings ?? ""), enterprises: String(row.enterprises ?? ""), area: row.area ?? "", occupancy: String(row.occupancy ?? ""), manager: row.manager ?? "顾龙飞", status: row.status ?? "运营中" } : { name: "", district: "浦东新区", buildings: "", enterprises: "", area: "", occupancy: "", manager: "顾龙飞", status: "运营中" }); setFormOpen(true); }
  async function saveCampus(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!form.name.trim()) return toast.warning("请填写园区名称"); const payload = { ...form, buildings: Number(form.buildings) || 0, enterprises: Number(form.enterprises) || 0, occupancy: Number(form.occupancy) || 0 }; try { if (editing) await data.updateRecord(editing.id, payload); else await data.createRecord(payload as Omit<Row, "id">); setFormOpen(false); toast.success(editing ? "园区信息已更新" : "园区已创建"); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "园区保存失败"); } }
  return <div className="business-page"><PageHeading title="园区管理" description="维护园区运营信息、楼宇概况和企业服务负责人" source={data.source} actions={<Button onClick={() => openEdit()}><Plus data-icon="inline-start" />新增园区</Button>} /><StatBar scope="当前筛选" items={[{ label: "园区载体", value: filtered.length, suffix: "个" }, { label: "楼宇", value: filtered.reduce((sum, row) => sum + Number(row.buildings || 0), 0), suffix: "栋" }, { label: "入驻企业", value: filtered.reduce((sum, row) => sum + Number(row.enterprises || 0), 0), suffix: "家" }, { label: "平均入驻率", value: filtered.length ? (filtered.reduce((sum, row) => sum + Number(row.occupancy || 0), 0) / filtered.length).toFixed(1) : "0.0", suffix: "%", tone: "success" }, { label: "运营中", value: filtered.filter((row) => row.status === "运营中").length, suffix: "个" }]} /><PageSection title="园区清单" description={`共 ${filtered.length} 个园区`}><div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="搜索园区名称" /><NativeSelect label="所在区域" value={district} onChange={setDistrict} options={districts} /><NativeSelect label="运营状态" value={status} onChange={setStatus} options={["运营中", "建设中", "暂停运营"]} /><div className="business-view-switch"><Button size="sm" variant={view === "card" ? "default" : "outline"} onClick={() => setView("card")}>卡片</Button><Button size="sm" variant={view === "table" ? "default" : "outline"} onClick={() => setView("table")}>列表</Button></div></div>{view === "table" ? <DataTable columns={columns} data={filtered} openRowDetails={false} onRowClick={setSelected} detailTitle="园区详情" /> : <div className="campus-card-grid">{filtered.map((row) => <article key={row.id} className="campus-card"><button type="button" className="campus-card-main" onClick={() => setSelected(row)}><div><span className="campus-card-icon"><Building2 /></span><StatusValue value={row.status} /></div><strong>{row.name}</strong><small>{row.district} · 运营负责人 {row.manager}</small><div className="campus-card-values"><span><b>{row.buildings}</b>栋楼宇</span><span><b>{row.enterprises}</b>家企业</span><span><b>{row.occupancy}%</b>入驻率</span></div><div className="park-occupancy"><i style={{ width: `${Math.min(100, Number(row.occupancy))}%` }} /></div></button><div className="campus-card-actions"><Button size="sm" variant="outline" onClick={() => setSelected(row)}>楼宇管理</Button><Button size="sm" variant="ghost" onClick={() => openEdit(row)}>编辑</Button></div></article>)}</div>}</PageSection>
    <FormDialog open={formOpen} onOpenChange={setFormOpen} title={editing ? "编辑园区" : "新增园区"} onSubmit={saveCampus}><FormField label="园区名称" required><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></FormField><FormField label="所在区域"><select className="business-input" value={form.district} onChange={(event) => setForm({ ...form, district: event.target.value })}>{districts.map((item) => <option key={item}>{item}</option>)}</select></FormField><FormField label="楼宇数量"><Input type="number" value={form.buildings} onChange={(event) => setForm({ ...form, buildings: event.target.value })} /></FormField><FormField label="入驻企业"><Input type="number" value={form.enterprises} onChange={(event) => setForm({ ...form, enterprises: event.target.value })} /></FormField><FormField label="载体面积"><Input value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })} /></FormField><FormField label="入驻率 %"><Input type="number" min="0" max="100" value={form.occupancy} onChange={(event) => setForm({ ...form, occupancy: event.target.value })} /></FormField><FormField label="运营负责人"><select className="business-input" value={form.manager} onChange={(event) => setForm({ ...form, manager: event.target.value })}>{platformUsers.map((item) => <option key={item}>{item}</option>)}</select></FormField><FormField label="运营状态"><select className="business-input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>运营中</option><option>建设中</option><option>暂停运营</option></select></FormField></FormDialog>
    <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><SheetContent side="right" className="business-detail-sheet"><SheetHeader><SheetTitle>{selected?.name}</SheetTitle><SheetDescription>{selected?.district} · 园区运营</SheetDescription></SheetHeader>{selected && <><div className="business-metric-grid compact"><MetricCard title="楼宇" value={selected.buildings} /><MetricCard title="企业" value={selected.enterprises} /><MetricCard title="面积" value={selected.area} /><MetricCard title="入驻率" value={`${selected.occupancy}%`} /></div><p>负责人 {selected.manager} · 状态 {selected.status}</p><PageSection title="楼宇清单" description="演示空间数据"><DataTable columns={[{ key: "name", header: "楼宇" }, { key: "floors", header: "楼层" }, { key: "area", header: "建筑面积" }, { key: "status", header: "招商状态", cell: (row) => <StatusValue value={row.status} /> }]} data={Array.from({ length: Math.min(Number(selected.buildings) || 3, 6) }, (_, index) => ({ id: `${selected.id}-B${index}`, name: `${selected.name} ${String.fromCharCode(1 + 65 + index)}座`, floors: 12 + index * 2, area: `${1.2 + index * 0.3} 万㎡`, status: ["招商中", "部分入驻", "满租"][index % 3] }))} /></PageSection><Button variant="outline" onClick={() => { const campus = selected; setSelected(null); navigate("/myCampus/corporateArchives/index", { state: { park: campus.name } }); }}>查看企业档案</Button></>}</SheetContent></Sheet></div>;
}

export function CorporateArchivesPage() {
  const location = useLocation();
  const visitOrderData = useBusinessCollection<Row>({ key: "youshu-visit-orders", seed: visitOrders, apiCollection: "visitOrders" });
  const seed: Row[] = (companies as Row[]).map((row, index) => ({ ...row, archiveStatus: index === 9 ? "已迁出" : index === 19 ? "已消失" : "正常经营", registerCapital: row.regCapital, businessChange: ["无提示", "已更名", "未匹配"][index % 3], recruitment: ["增长", "稳定", "下降"][index % 3], patents: [0, 3, 12, 24, 38][index % 5] }));
  const data = useBusinessCollection<Row>({ key: "youshu-company-archives", seed });
  const requestedPark = (location.state as { park?: string } | null)?.park;
  const matchingPark = requestedPark
    ? String(seed.find((row) => String(row.park).includes(requestedPark))?.park ?? requestedPark)
    : "";
  const initialDrawerValue: Record<string, string[]> = matchingPark ? { park: [matchingPark] } : {};
  const [drawerValue, setDrawerValue] = useState(initialDrawerValue);
  const [keyword, setKeyword] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const groups = [
    { key: "district", label: "注册区域", options: districts },
    { key: "park", label: "所属园区", options: [...new Set(data.rows.map((row) => row.park))] },
    { key: "industry", label: "所属行业", options: [...new Set(data.rows.map((row) => row.industry))] },
    { key: "scale", label: "企业规模", options: ["微型", "小型", "中型", "大型", "超大型"] },
    { key: "archiveStatus", label: "经营状态", options: ["正常经营", "已迁出", "已消失"] },
    { key: "businessChange", label: "工商变更", options: ["无提示", "已注销", "已吊销", "已迁出", "未匹配", "已更名"] },
    { key: "recruitment", label: "招聘趋势", options: ["增长", "稳定", "下降"] },
    { key: "patents", label: "知识产权", options: ["0", "1-5", "6-20", "20+"] },
    { key: "socialSecurity", label: "社保人数", options: ["1-10", "11-50", "51-200", "200+"] },
    { key: "registerDate", label: "注册年限", options: ["1 年内", "1-3 年", "3-5 年", "5 年以上"] },
  ];
  const archiveConditions = drawerValue;
  const filtered = data.rows.filter((row) => (!keyword || `${row.name} ${row.code}`.includes(keyword)) && groups.every((group) => !archiveConditions[group.key]?.length || archiveConditions[group.key].some((item) => {
    const raw = String(row[group.key] ?? "");
    if (group.key === "patents") return item === "0" ? Number(raw) === 0 : item === "1-5" ? Number(raw) >= 1 && Number(raw) <= 5 : item === "6-20" ? Number(raw) >= 6 && Number(raw) <= 20 : Number(raw) > 20;
    if (group.key === "socialSecurity") { const count = Number(raw); return item === "1-10" ? count <= 10 : item === "11-50" ? count > 10 && count <= 50 : item === "51-200" ? count > 50 && count <= 200 : count > 200; }
    if (group.key === "registerDate") {
      const years = new Date().getFullYear() - Number(raw.slice(0, 4));
      return item === "1 年内" ? years <= 1 : item === "1-3 年" ? years > 1 && years <= 3 : item === "3-5 年" ? years > 3 && years <= 5 : years > 5;
    }
    return raw.includes(item);
  })));
  const columns: DataColumn<Row>[] = [{ key: "name", header: "企业名称", sortable: true }, { key: "park", header: "所属园区" }, { key: "industry", header: "行业" }, { key: "scale", header: "规模" }, { key: "socialSecurity", header: "社保人数", sortable: true }, { key: "settleDate", header: "入驻日期", sortable: true }, { key: "tags", header: "企业标签", cell: (row) => (row.tags ?? []).join("、") }, { key: "archiveStatus", header: "经营状态", cell: (row) => <StatusValue value={row.archiveStatus} /> }];
  async function importCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = document.querySelector<HTMLInputElement>("#archive-csv");
    const file = input?.files?.[0];
    if (!file) return toast.warning("请选择 CSV 文件");
    const lines = (await file.text()).split(/\r?\n/).filter(Boolean);
    const headers = (lines.shift() ?? "").split(",").map((value) => value.trim());
    const records = lines.map((line) => {
      const values = line.split(",").map((value) => value.trim());
      return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    }).filter((row) => row.name || row.company);
    if (!records.length) return toast.warning("CSV 中没有可导入的企业记录");
    for (const row of records) {
      await data.createRecord({ ...row, name: row.name || row.company, archiveStatus: row.archiveStatus || "正常经营", tags: row.tags ? String(row.tags).split("|") : [] } as Omit<Row, "id">);
    }
    setImportOpen(false);
    toast.success(`已导入 ${records.length} 家企业到本地档案`);
  }
  async function requestServiceFollowUp(row: Row) {
    const planDate = new Date();
    planDate.setDate(planDate.getDate() + 7);
    try {
      await visitOrderData.createRecord({
        title: `企业服务跟进 · ${row.name}`,
        company: row.name,
        source: "企业档案",
        owner: String(platformUsers[0]),
        planDate: planDate.toISOString().slice(0, 10),
        priority: row.archiveStatus === "已迁出" ? "高" : "中",
        note: `园区：${row.park}。请核实经营状态、企业诉求及可提供的服务。`,
        status: "待走访",
        creator: localStorage.getItem("DEMO_USER") || "本地管理员",
        created: new Date().toISOString().slice(0, 10),
      });
      toast.success(`已为 ${row.name} 创建服务跟进工单`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "创建服务跟进失败");
    }
  }
  return <div className="business-page"><PageHeading title="企业档案" description="从工商、招聘、经营和知识产权等维度查看园区企业画像" source={data.source} actions={<><Button variant="outline" onClick={() => setImportOpen(true)}><Upload data-icon="inline-start" />批量导入</Button><Button variant="outline" onClick={() => toast.success("当前档案已导出")}><Download data-icon="inline-start" />导出</Button></>} /><StatBar scope="全库口径" items={[{ label: "入驻企业总数", value: archiveStats.settled.toLocaleString(), suffix: "家" }, { label: "累计迁出", value: archiveStats.migrated, suffix: "家", tone: "gold" }, { label: "企业消失", value: archiveStats.vanished, suffix: "家" }, { label: "平均入驻年限", value: archiveStats.avgYears, suffix: "年" }, { label: "企业留存率", value: archiveStats.retention, tone: "success" }]} /><PageSection title="企业档案" description={`当前筛选 ${filtered.length} 家企业`}><div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="企业名称或统一社会信用代码" /><Button variant="outline" onClick={() => setDrawerOpen(true)}><Filter data-icon="inline-start" />更多筛选（30+ 维度）</Button></div><DataTable columns={columns} data={filtered} openRowDetails={false} onRowClick={setSelected} detailTitle="企业档案" renderDetails={(row) => <ArchiveDetail row={row} onFollowUp={() => void requestServiceFollowUp(row)} />} /></PageSection>
    <FilterDrawer open={drawerOpen} onOpenChange={setDrawerOpen} title="企业高级筛选" groups={groups} value={drawerValue} onChange={setDrawerValue} onQuery={() => setDrawerOpen(false)} onReset={() => setDrawerValue({})} />
    <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><SheetContent side="right" className="business-detail-sheet"><SheetHeader><SheetTitle>{selected?.name}</SheetTitle><SheetDescription>企业全景档案 · {selected?.industry}</SheetDescription></SheetHeader>{selected && <ArchiveDetail row={selected} onFollowUp={() => void requestServiceFollowUp(selected)} />}</SheetContent></Sheet>
    <Dialog open={importOpen} onOpenChange={setImportOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>批量导入企业档案</DialogTitle><DialogDescription>CSV 首行使用字段名。支持 name、district、industry、scale、socialSecurity、park、tags 等字段。</DialogDescription></DialogHeader><form onSubmit={importCsv} className="archive-import-form"><input id="archive-csv" type="file" accept=".csv,text/csv" required /><p>标签字段可用竖线分隔，例如 高新技术企业|专精特新。</p><div><Button type="button" variant="outline" onClick={() => setImportOpen(false)}>取消</Button><Button type="submit">导入 CSV</Button></div></form></DialogContent></Dialog></div>;
}

function ArchiveDetail({ row, onFollowUp }: { row: Row; onFollowUp: () => void }) {
  return <div className="archive-detail"><div className="business-company-summary"><div className="business-company-mark">{String(row.name).slice(0, 1)}</div><div><h3>{row.name}</h3><p>{row.industry} · {row.scale}企业</p></div></div><dl className="business-detail-list"><div><dt>统一社会信用代码</dt><dd>{row.code}</dd></div><div><dt>注册资本</dt><dd>{row.regCapital}</dd></div><div><dt>注册地址</dt><dd>{row.address}</dd></div><div><dt>所属园区</dt><dd>{row.park}</dd></div><div><dt>社保人数</dt><dd>{row.socialSecurity} 人</dd></div><div><dt>工商变更</dt><dd>{row.businessChange}</dd></div><div><dt>知识产权</dt><dd>{row.patents} 项</dd></div><div><dt>招聘趋势</dt><dd>{row.recruitment}</dd></div><div><dt>经营状态</dt><dd><StatusValue value={row.archiveStatus} /></dd></div></dl><div className="business-chip-row">{(row.tags ?? []).map((tag: string) => <StatusTag key={tag} value={tag} tone="info" />)}</div><Button variant="outline" onClick={onFollowUp}>发起企业服务跟进</Button></div>;
}

export function MigrationWarningPage() {
  const data = useBusinessCollection<Row>({ key: "youshu-migration-enterprises", seed: migrationEnterprises });
  const [risk, setRisk] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [park, setPark] = useState("");
  const [feedback, setFeedback] = useState("");
  const [quickFilters, setQuickFilters] = useState<Record<string, string[]>>({ signal: ["企业迁出"] });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [current, setCurrent] = useState<Row | null>(null);
  const [followOpen, setFollowOpen] = useState(false);
  const [follow, setFollow] = useState({ feedback: "跟进中", intent: "有迁出意向", destination: "", note: "" });
  const [ruleOpen, setRuleOpen] = useState(false);
  const [rules, setRules] = useState(() => {
    try { const saved = localStorage.getItem("youshu-migration-rules"); return saved ? JSON.parse(saved) as Array<{ name: string; desc: string; on: boolean }> : [{ name: "招聘岗位骤降", desc: "近 3 个月招聘岗位数下降超过 30%", on: true }, { name: "社保人数下降", desc: "连续两个季度社保人数下降超过 15%", on: true }, { name: "租约临期", desc: "办公场地租约剩余不足 12 个月", on: true }, { name: "对外投资", desc: "近 12 个月在省外新设分支机构", on: true }, { name: "经营异常", desc: "出现经营异常或司法风险", on: true }, { name: "股权变更", desc: "发生大股东变更或控制权转移", on: false }]; } catch { return []; }
  });
  const groups = [{ key: "signal", label: "风险信号", options: ["企业迁出", "有迁出意向", "无迁出意向", "未反馈"] }, { key: "risk", label: "风险等级", options: ["高风险", "中风险", "低风险", "安全"] }, { key: "drive", label: "风险驱动", options: ["双向承压", "内部主导", "外部主导"] }, { key: "feedback", label: "企业反馈", options: ["未反馈", "已反馈", "跟进中"] }];
  const selectedSignals = quickFilters.signal ?? [];
  const filtered = data.rows.filter((row) => (risk === "all" || row.risk === risk) && (!keyword || String(row.name).includes(keyword)) && (!park || row.park === park) && (!feedback || row.feedback === feedback) && (!quickFilters.risk?.length || quickFilters.risk.includes(row.risk)) && (!quickFilters.drive?.length || quickFilters.drive.includes(row.drive)) && (!quickFilters.feedback?.length || quickFilters.feedback.includes(row.feedback)) && (!selectedSignals.includes("企业迁出") || row.intent !== "-") && (!selectedSignals.includes("有迁出意向") || row.intent !== "-") && (!selectedSignals.includes("无迁出意向") || row.intent === "-") && (!selectedSignals.includes("未反馈") || row.feedback === "未反馈"));
  const segments = [{ label: "全部企业", key: "all", value: 3105 }, { label: "高风险", key: "高风险", value: migrationStats.high }, { label: "中风险", key: "中风险", value: migrationStats.mid }, { label: "低风险", key: "低风险", value: migrationStats.low }, { label: "安全", key: "安全", value: migrationStats.safe }];
  const columns: DataColumn<Row>[] = [{ key: "name", header: "企业名称", sortable: true }, { key: "risk", header: "风险等级", cell: (row) => <StatusValue value={row.risk} /> }, { key: "score", header: "风险评分", sortable: true, cell: (row) => <strong className={row.risk === "高风险" ? "business-score danger" : "business-score"}>{row.score} 分</strong> }, { key: "trend", header: "趋势" }, { key: "drive", header: "主导因素" }, { key: "push", header: "推力信号" }, { key: "pull", header: "拉力信号" }, { key: "park", header: "所属园区" }, { key: "intent", header: "迁移意向" }, { key: "feedback", header: "企业反馈", cell: (row) => <StatusValue value={row.feedback} /> }, { key: "action", header: "处理", cell: (row) => <Button size="sm" variant="outline" onClick={() => openFollow(row)}>记录反馈</Button> }];
  function openFollow(row: Row) { setCurrent(row); setFollow({ feedback: row.feedback === "未反馈" ? "跟进中" : row.feedback, intent: row.intent === "-" ? "观望中" : "有迁出意向", destination: row.intent === "-" ? "" : row.intent, note: "" }); setFollowOpen(true); }
  async function saveFollow(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!current) return; try { const saved = await data.updateRecord(current.id, { feedback: follow.feedback, intent: follow.destination || follow.intent, note: follow.note, feedbackDate: new Date().toISOString().slice(0, 10) }); setCurrent(saved); setFollowOpen(false); toast.success("企业跟进反馈已保存"); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "反馈保存失败"); } }
  return <div className="business-page"><PageHeading title="迁移预警" description="基于经营、招聘、租约和投资信号识别企业迁移风险" source={data.source} actions={<><Button variant="outline" onClick={() => setRuleOpen(true)}>预警规则</Button><Button variant="outline" onClick={() => toast.success("预警名单已导出")}><Download data-icon="inline-start" />导出名单</Button></>} /><div className="business-metric-grid"><MetricCard title="高风险企业" value={migrationStats.high} description="建议尽快发起走访" variant="surface" icon={<AlertTriangle />} /><MetricCard title="中风险企业" value={migrationStats.mid} description="持续观察经营变化" /><MetricCard title="低风险企业" value={migrationStats.low.toLocaleString()} description="轻度风险信号" /><MetricCard title="安全企业" value={migrationStats.safe.toLocaleString()} description="暂无明显迁移信号" /></div><PageSection title="风险企业清单" description={`当前筛选 ${filtered.length} 家企业`}><div className="risk-segments" role="tablist">{segments.map((item) => <button type="button" role="tab" aria-selected={risk === item.key} className={risk === item.key ? "is-active" : ""} key={item.key} onClick={() => setRisk(item.key)}>{item.label}<b>{item.value.toLocaleString()}</b></button>)}</div><div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="搜索企业名称" /><NativeSelect label="园区" value={park} onChange={setPark} options={[...new Set(data.rows.map((row) => row.park))]} /><NativeSelect label="反馈状态" value={feedback} onChange={setFeedback} options={["未反馈", "已反馈", "跟进中"]} /><Button variant="outline" onClick={() => setDrawerOpen(true)}><Filter data-icon="inline-start" />更多筛选</Button><Button variant="outline" onClick={() => { setRisk("all"); setKeyword(""); setPark(""); setFeedback(""); setQuickFilters({}); }}>重置</Button></div><DataTable columns={columns} data={filtered}  detailTitle="迁移风险企业" renderDetails={(row) => <RiskDetail row={row} rules={rules} onFollow={() => openFollow(row)} />} /></PageSection>
    <FilterDrawer open={drawerOpen} onOpenChange={setDrawerOpen} title="迁移风险筛选" groups={groups} value={quickFilters} onChange={setQuickFilters} onQuery={() => setDrawerOpen(false)} onReset={() => setQuickFilters({})} />
    <FormDialog open={followOpen} onOpenChange={setFollowOpen} title="企业跟进反馈" description={current?.name} onSubmit={saveFollow}><FormField label="跟进状态"><select className="business-input" value={follow.feedback} onChange={(event) => setFollow({ ...follow, feedback: event.target.value })}><option>跟进中</option><option>已反馈</option><option>未反馈</option></select></FormField><FormField label="迁移意向"><select className="business-input" value={follow.intent} onChange={(event) => setFollow({ ...follow, intent: event.target.value })}><option>有迁出意向</option><option>观望中</option><option>无迁出意向</option></select></FormField><FormField label="意向地区"><Input value={follow.destination} onChange={(event) => setFollow({ ...follow, destination: event.target.value })} placeholder="选填，例如苏州" /></FormField><FormField label="跟进记录"><Textarea value={follow.note} onChange={(event) => setFollow({ ...follow, note: event.target.value })} placeholder="记录企业反馈、服务诉求与下一步安排" /></FormField></FormDialog>
    <Dialog open={ruleOpen} onOpenChange={setRuleOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>迁移预警规则</DialogTitle><DialogDescription>启用规则将纳入后续风险观察配置</DialogDescription></DialogHeader><div className="rule-configuration-list">{rules.map((rule, index) => <label key={rule.name}><span className="rule-index">{String(index + 1).padStart(2, "0")}</span><span><strong>{rule.name}</strong><small>{rule.desc}</small></span><input type="checkbox" checked={rule.on} onChange={() => setRules((current) => { const next = current.map((item) => item.name === rule.name ? { ...item, on: !item.on } : item); localStorage.setItem("youshu-migration-rules", JSON.stringify(next)); return next; })} /></label>)}</div></DialogContent></Dialog></div>;
}

function RiskDetail({ row, rules, onFollow }: { row: Row; rules: Array<{ name: string; on: boolean }>; onFollow: () => void }) {
  const signals = [{ name: "招聘岗位数量", value: "近 3 个月变化", level: row.risk === "高风险" ? "高" : "中" }, { name: "社保缴纳人数", value: "近 6 个月变化", level: row.risk === "高风险" ? "高" : "低" }, { name: "办公场地租约", value: "剩余租期监测", level: "中" }, { name: "对外投资新增", value: row.pull, level: "中" }, { name: "风险规则", value: `${rules.filter((rule) => rule.on).length} 项规则启用`, level: "低" }];
  return <div className="risk-detail"><div className="risk-score-panel"><StatusValue value={row.risk} /><strong>{row.score}</strong><span>综合风险评分</span></div><dl className="business-detail-list"><div><dt>主导因素</dt><dd>{row.drive}</dd></div><div><dt>推力动因</dt><dd>{row.push}</dd></div><div><dt>拉力动因</dt><dd>{row.pull}</dd></div><div><dt>所属园区</dt><dd>{row.park}</dd></div><div><dt>意向地区</dt><dd>{row.intent}</dd></div><div><dt>企业反馈</dt><dd>{row.feedback}</dd></div></dl><PageSection title="风险信号" description="综合经营与外部扩张信息"><div className="risk-signal-list">{signals.map((signal) => <div key={signal.name}><span>{signal.name}</span><strong>{signal.value}</strong><StatusValue value={signal.level} /></div>)}</div></PageSection><Button onClick={onFollow}>记录跟进反馈</Button></div>;
}

export function GuaranteePage() {
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
  return <div className="business-page"><PageHeading title="企服保障" description="把年报、科技企业培育、政策到期和精准匹配转成可跟进任务" source={data.source} actions={<Button variant="outline" onClick={() => toast.success(`已向 ${filtered.length} 家企业发送服务提醒`)}>批量提醒</Button>} /><div className="business-metric-grid"><MetricCard title="待年报提醒" value={data.rows.filter((row) => String(row.status).startsWith("未报送")).length} description="企业年报报送跟进" icon={<FilePlus2 />} /><MetricCard title="科技企业培育" value={data.rows.length} description="纳入培育服务" /><MetricCard title="政策到期提醒" value="238" description="未来 90 天到期" /><MetricCard title="政策匹配结果" value="1,656" description="待企业申报跟进" /></div><PageSection title="企业服务任务" description={`当前 ${filtered.length} 条任务`}><SectionTabs items={tabItems} value={tab} onChange={(value) => { setTab(value); setKeyword(""); setPark(""); setOwner(""); }} /><div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="搜索企业名称" /><NativeSelect label="所属园区" value={park} onChange={setPark} options={[...new Set(taskRows.map((row) => row.park))]} /><NativeSelect label="负责人" value={owner} onChange={setOwner} options={[...new Set(taskRows.map((row) => row.owner))]} /><Button variant="outline" onClick={() => toast.success("企业服务任务已导出")}><Download data-icon="inline-start" />导出</Button></div><DataTable columns={[...tabColumns[tab], { key: "action", header: "操作", cell: (row) => <Button size="sm" variant="outline" onClick={() => void process(row)}>{tab === "report" ? "发送年报提醒" : tab === "match" ? "查看匹配" : "创建服务任务"}</Button> }]} data={filtered} openRowDetails={false} onRowClick={setSelected} detailTitle="企业服务保障" /></PageSection><Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><SheetContent side="right" className="business-detail-sheet"><SheetHeader><SheetTitle>{selected?.name}</SheetTitle><SheetDescription>{tabItems.find((item) => item.key === tab)?.label}</SheetDescription></SheetHeader>{selected && <><dl className="business-detail-list">{Object.entries(selected).filter(([key]) => key !== "id").map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value ?? "—")}</dd></div>)}</dl><Button onClick={() => void process(selected)}>创建服务跟进</Button></>}</SheetContent></Sheet></div>;
}

export function VisitManagePage() {
  const location = useLocation();
  const orders = useBusinessCollection<Row>({ key: "youshu-visit-orders", seed: visitOrders, apiCollection: "visitOrders" });
  const records = useBusinessCollection<Row>({ key: "youshu-visit-records", seed: visitRecords, apiCollection: "visitRecords" });
  const [tab, setTab] = useState("orders");
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [owner, setOwner] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [completeOrder, setCompleteOrder] = useState<Row | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [recordDetail, setRecordDetail] = useState<Row | null>(null);
  const requestedCompany = (location.state as { company?: string } | null)?.company;
  const [form, setForm] = useState({ title: "", company: requestedCompany ?? "", source: requestedCompany ? "企业档案" : "手动创建", owner: String(platformUsers[0]), planDate: "", priority: "中", note: "" });
  const [complete, setComplete] = useState({ result: "", duration: "45 分钟" });
  const rows = tab === "orders" ? orders.rows : records.rows;
  const filtered = rows.filter((row) => (!keyword || `${row.title} ${row.company ?? ""}`.includes(keyword)) && (!owner || row.owner === owner) && (!status || row.status === status));
  const orderColumns: DataColumn<Row>[] = [{ key: "title", header: "工单标题", sortable: true }, { key: "company", header: "关联企业" }, { key: "owner", header: "负责人" }, { key: "source", header: "触发来源" }, { key: "planDate", header: "计划日期", sortable: true }, { key: "priority", header: "优先级", cell: (row) => <StatusValue value={row.priority} /> }, { key: "status", header: "状态", cell: (row) => <StatusValue value={row.status} /> }, { key: "action", header: "操作", cell: (row) => row.status === "已完成" ? <Button size="sm" variant="outline" onClick={() => setDetail(row)}>查看</Button> : <Button size="sm" variant="outline" onClick={() => { setCompleteOrder(row); setComplete({ result: "", duration: "45 分钟" }); }}>完成走访</Button> }];
  const recordColumns: DataColumn<Row>[] = [{ key: "title", header: "走访主题", sortable: true }, { key: "company", header: "关联企业" }, { key: "owner", header: "走访人" }, { key: "date", header: "走访日期", sortable: true }, { key: "duration", header: "时长" }, { key: "result", header: "走访结果" }, { key: "action", header: "操作", cell: (row) => <Button size="sm" variant="outline" onClick={() => setRecordDetail(row)}>详情</Button> }];
  async function createOrder(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!form.title.trim()) return toast.warning("请填写工单标题"); try { await orders.createRecord({ ...form, creator: localStorage.getItem("DEMO_USER") || "本地管理员", status: "待走访", created: new Date().toISOString().slice(0, 10) } as Omit<Row, "id">); setCreateOpen(false); setForm({ ...form, title: "", company: "", planDate: "", note: "" }); toast.success("走访工单已创建"); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "工单创建失败"); } }
  async function completeVisit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!completeOrder || !complete.result.trim()) return toast.warning("请填写走访结果"); try { if (orders.source === "server" && records.source === "server") { const saved = await api.completeVisit(completeOrder.id, complete); orders.setRows((items) => items.map((row) => row.id === completeOrder.id ? saved.order : row)); records.setRows((items) => [saved.record, ...items]); } else { await orders.updateRecord(completeOrder.id, { status: "已完成" }); await records.createRecord({ title: completeOrder.title, company: completeOrder.company, owner: completeOrder.owner, date: new Date().toISOString().slice(0, 10), result: complete.result, duration: complete.duration } as Omit<Row, "id">); } setCompleteOrder(null); setDetail(null); toast.success("走访已完成，记录已归档"); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "完成走访失败"); } }
  return <div className="business-page"><PageHeading title="走访管理" description="将迁移预警、政策到期和企业服务需求转为走访工单与过程记录" source={orders.source} actions={tab === "orders" ? <Button onClick={() => setCreateOpen(true)}><Plus data-icon="inline-start" />新增工单</Button> : <Button variant="outline" onClick={() => toast.success("走访记录已导出")}><Download data-icon="inline-start" />导出记录</Button>} /><div className="business-metric-grid"><MetricCard title="待走访工单" value={orders.rows.filter((row) => row.status === "待走访").length} description="等待执行" icon={<CalendarDays />} /><MetricCard title="走访中" value={orders.rows.filter((row) => row.status === "走访中").length} description="正在服务企业" /><MetricCard title="本月完成" value={records.rows.length} description="已归档走访记录" /><MetricCard title="高优先级" value={orders.rows.filter((row) => row.priority === "高" && row.status !== "已完成").length} description="建议优先安排" /></div><PageSection title="走访工作台" description={`共 ${filtered.length} 条记录`}><SectionTabs items={[{ key: "orders", label: "走访工单", count: orders.rows.length }, { key: "records", label: "走访记录", count: records.rows.length }]} value={tab} onChange={(value) => { setTab(value); setKeyword(""); setOwner(""); setStatus(""); }} /><div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder={tab === "orders" ? "搜索工单或企业" : "搜索走访主题或企业"} /><NativeSelect label="负责人" value={owner} onChange={setOwner} options={[...new Set(rows.map((row) => row.owner))]} />{tab === "orders" && <NativeSelect label="工单状态" value={status} onChange={setStatus} options={["待走访", "走访中", "已完成", "已取消"]} />}</div><DataTable columns={tab === "orders" ? orderColumns : recordColumns} data={filtered} openRowDetails={false} onRowClick={tab === "orders" ? setDetail : setRecordDetail} detailTitle={tab === "orders" ? "走访工单" : "走访记录"} /></PageSection>
    <FormDialog open={createOpen} onOpenChange={setCreateOpen} title="新增走访工单" onSubmit={createOrder}><FormField label="工单主题" required><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></FormField><FormField label="关联企业"><Input value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} /></FormField><FormField label="触发来源"><select className="business-input" value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })}>{["手动创建", "迁移预警", "政策到期", "企服保障", "企业档案"].map((item) => <option key={item}>{item}</option>)}</select></FormField><FormField label="执行人"><select className="business-input" value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })}>{platformUsers.map((item) => <option key={item}>{item}</option>)}</select></FormField><FormField label="计划走访日期" required><Input type="date" value={form.planDate} onChange={(event) => setForm({ ...form, planDate: event.target.value })} required /></FormField><FormField label="优先级"><select className="business-input" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option>高</option><option>中</option><option>低</option></select></FormField><FormField label="备注"><Textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></FormField></FormDialog>
    <FormDialog open={Boolean(completeOrder)} onOpenChange={(open) => !open && setCompleteOrder(null)} title="完成走访" description={completeOrder?.title} onSubmit={completeVisit}><FormField label="走访结果" required><Textarea value={complete.result} onChange={(event) => setComplete({ ...complete, result: event.target.value })} required placeholder="记录企业需求、风险反馈和后续事项" /></FormField><FormField label="走访时长"><Input value={complete.duration} onChange={(event) => setComplete({ ...complete, duration: event.target.value })} /></FormField></FormDialog>
    <Sheet open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}><SheetContent side="right" className="business-detail-sheet"><SheetHeader><SheetTitle>{detail?.title}</SheetTitle><SheetDescription>走访工单 · {detail?.status}</SheetDescription></SheetHeader>{detail && <><dl className="business-detail-list">{Object.entries(detail).filter(([key]) => key !== "id").map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value ?? "—")}</dd></div>)}</dl>{detail.status !== "已完成" && <Button onClick={() => { setCompleteOrder(detail); setDetail(null); }}>完成走访</Button>}</>}</SheetContent></Sheet>
    <Sheet open={Boolean(recordDetail)} onOpenChange={(open) => !open && setRecordDetail(null)}><SheetContent side="right" className="business-detail-sheet"><SheetHeader><SheetTitle>{recordDetail?.title}</SheetTitle><SheetDescription>走访记录 · {recordDetail?.date}</SheetDescription></SheetHeader>{recordDetail && <dl className="business-detail-list">{Object.entries(recordDetail).filter(([key]) => key !== "id").map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value ?? "—")}</dd></div>)}</dl>}</SheetContent></Sheet></div>;
}
