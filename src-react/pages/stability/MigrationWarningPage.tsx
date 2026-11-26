import { useReportExport } from "@/app/ReportQueue";
import { ActionButton, usePrincipal } from "@/app/AccessContext";
import { useNavigate } from "react-router-dom";
import { api } from "../../../src/api.js";
import { useState, type FormEvent } from "react";
import { AlertTriangle, Download, Filter } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type DataColumn } from "@/../src/components/shared/DataTable";
import { FilterDrawer } from "@/../src/components/shared/FilterDrawer";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { migrationEnterprises } from "../../../src/data/mock.js";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { FormDialog, FormField, InlineError, NativeSelect, PageHeading, PageSection, SearchField, StatusValue } from "@/pages/PagePrimitives";

type Row = Record<string, any> & { id: string | number };

export function MigrationWarningPage() {
  const principal = usePrincipal();
  const navigate = useNavigate();
  const enqueue = useReportExport();
  const data = useBusinessCollection<Row>({ key: "youshu-migration-enterprises", seed: migrationEnterprises, apiCollection: "migrationWarnings" });
  const ruleData = useBusinessCollection<Row>({ key: "youshu-migration-rules", seed: [{ id: "migration-rules", rules: [] }], apiCollection: "migrationRules" });
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
  const defaultRules = [{ name: "招聘岗位骤降", desc: "近 3 个月招聘岗位数下降超过 30%", on: true }, { name: "社保人数下降", desc: "连续两个季度社保人数下降超过 15%", on: true }, { name: "租约临期", desc: "办公场地租约剩余不足 12 个月", on: true }, { name: "对外投资", desc: "近 12 个月在省外新设分支机构", on: true }, { name: "经营异常", desc: "出现经营异常或司法风险", on: true }, { name: "股权变更", desc: "发生大股东变更或控制权转移", on: false }];
  const rules = (ruleData.rows.find((row) => row.id === "migration-rules")?.rules ?? defaultRules) as Array<{ name: string; desc: string; on: boolean }>;
  const usesDefaultRules = !ruleData.rows.some((row) => row.id === "migration-rules" && Array.isArray(row.rules) && row.rules.length);
  const [ruleDraft, setRuleDraft] = useState(rules);
  const groups = [{ key: "signal", label: "风险信号", options: ["企业迁出", "有迁出意向", "无迁出意向", "未反馈"] }, { key: "risk", label: "风险等级", options: ["高风险", "中风险", "低风险", "安全"] }, { key: "drive", label: "风险驱动", options: ["双向承压", "内部主导", "外部主导"] }, { key: "feedback", label: "企业反馈", options: ["未反馈", "已反馈", "跟进中"] }];
  const selectedSignals = quickFilters.signal ?? [];
  const filtered = data.rows.filter((row) => (risk === "all" || row.risk === risk) && (!keyword || String(row.name).includes(keyword)) && (!park || row.park === park) && (!feedback || row.feedback === feedback) && (!quickFilters.risk?.length || quickFilters.risk.includes(row.risk)) && (!quickFilters.drive?.length || quickFilters.drive.includes(row.drive)) && (!quickFilters.feedback?.length || quickFilters.feedback.includes(row.feedback)) && (!selectedSignals.includes("企业迁出") || row.intent !== "-") && (!selectedSignals.includes("有迁出意向") || row.intent !== "-") && (!selectedSignals.includes("无迁出意向") || row.intent === "-") && (!selectedSignals.includes("未反馈") || row.feedback === "未反馈"));
  const riskCounts = { "高风险": data.rows.filter((row) => row.risk === "高风险").length, "中风险": data.rows.filter((row) => row.risk === "中风险").length, "低风险": data.rows.filter((row) => row.risk === "低风险").length, "安全": data.rows.filter((row) => row.risk === "安全").length };
  const segments = [{ label: "全部企业", key: "all", value: data.rows.length }, ...Object.entries(riskCounts).map(([key, value]) => ({ label: key, key, value }))];
  const columns: DataColumn<Row>[] = [{ key: "name", header: "企业名称", sortable: true }, { key: "risk", header: "风险等级", cell: (row) => <StatusValue value={row.risk} /> }, { key: "score", header: "风险评分", sortable: true, cell: (row) => <strong className={row.risk === "高风险" ? "business-score danger" : "business-score"}>{row.score} 分</strong> }, { key: "trend", header: "趋势" }, { key: "drive", header: "主导因素" }, { key: "push", header: "推力信号" }, { key: "pull", header: "拉力信号" }, { key: "park", header: "所属园区" }, { key: "intent", header: "迁移意向" }, { key: "feedback", header: "企业反馈", cell: (row) => <StatusValue value={row.feedback} /> }, { key: "action", header: "处理", cell: (row) => <ActionButton action="编辑" size="sm" variant="outline" onClick={() => openFollow(row)}>记录反馈</ActionButton> }];
  function openFollow(row: Row) { setCurrent(row); setFollow({ feedback: row.feedback === "未反馈" ? "跟进中" : row.feedback, intent: row.intent === "-" ? "观望中" : "有迁出意向", destination: row.intent === "-" ? "" : row.intent, note: "" }); setFollowOpen(true); }
  function selectRisk(key: string) {
    setRisk(key);
    setQuickFilters((current) => ({ ...current, risk: key === "all" ? [] : [key] }));
  }
  async function saveFollow(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!current) return; try { const saved = await data.updateRecord(current.id, { feedback: follow.feedback, intent: follow.destination || follow.intent, note: follow.note, feedbackDate: new Date().toISOString().slice(0, 10) }); setCurrent(saved); setFollowOpen(false); toast.success("企业跟进反馈已保存"); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "反馈保存失败"); } }
  return <div className="business-page"><PageHeading title="迁移预警" description="基于经营、招聘、租约和投资信号识别企业迁移风险" source={data.source} actions={<><ActionButton action="编辑" variant="outline" onClick={() => { setRuleDraft(rules); setRuleOpen(true); }}>预警规则</ActionButton><ActionButton action="导出" variant="outline" onClick={() => enqueue("迁移预警.csv", [{ header: "企业", value: row => row.name }, { header: "风险", value: row => row.risk }, { header: "评分", value: row => row.score }, { header: "园区", value: row => row.park }], filtered)}><Download data-icon="inline-start" />导出名单</ActionButton></>} /><div className="business-metric-grid"><MetricCard title="高风险企业" value={riskCounts["高风险"]} description="建议尽快发起走访" variant="surface" icon={<AlertTriangle />} /><MetricCard title="中风险企业" value={riskCounts["中风险"]} description="持续观察经营变化" /><MetricCard title="低风险企业" value={riskCounts["低风险"]} description="轻度风险信号" /><MetricCard title="安全企业" value={riskCounts["安全"]} description="暂无明显迁移信号" /></div><PageSection title="风险企业清单" description={`当前筛选 ${filtered.length} 家企业`}><div className="risk-segments" role="tablist">{segments.map((item) => <button type="button" role="tab" aria-selected={risk === item.key} className={risk === item.key ? "is-active" : ""} key={item.key} onClick={() => selectRisk(item.key)}>{item.label}<b>{item.value.toLocaleString()}</b></button>)}</div><div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="搜索企业名称" /><NativeSelect label="园区" value={park} onChange={setPark} options={[...new Set(data.rows.map((row) => row.park))]} /><NativeSelect label="反馈状态" value={feedback} onChange={setFeedback} options={["未反馈", "已反馈", "跟进中"]} /><Button variant="outline" onClick={() => setDrawerOpen(true)}><Filter data-icon="inline-start" />更多筛选</Button><Button variant="outline" onClick={() => { setRisk("all"); setKeyword(""); setPark(""); setFeedback(""); setQuickFilters({}); }}>重置</Button></div><DataTable columns={columns} data={filtered} detailTitle="迁移风险企业" renderDetails={(row) => <RiskDetail row={row} rules={rules} onFollow={() => openFollow(row)} onCreateVisit={async () => {
      try {
        await api.create("visitOrders", { title: `迁移预警企业走访 · ${row.name}`, company: row.name, source: "迁移预警", owner: principal?.displayName || principal?.user || "待分派", planDate: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10), priority: row.risk === "高风险" ? "高" : "中", status: "待走访", created: new Date().toISOString().slice(0, 10), park: row.park, parkId: row.parkId, note: `推力因素：${row.push}；拉力因素：${row.pull}` });
        toast.success("迁移预警已转为走访督办工单");
        navigate("/myCampus/visitManage/index");
      } catch (cause) { toast.error(cause instanceof Error ? cause.message : "创建走访工单失败"); }
    }} />} /></PageSection>
    <FilterDrawer open={drawerOpen} onOpenChange={setDrawerOpen} title="迁移风险筛选" groups={groups} value={quickFilters} onChange={(next) => { setQuickFilters(next); setRisk(next.risk?.[0] ?? "all"); }} onQuery={() => setDrawerOpen(false)} onReset={() => { setQuickFilters({}); setRisk("all"); }} />
    <FormDialog open={followOpen} onOpenChange={setFollowOpen} title="企业跟进反馈" description={current?.name} onSubmit={saveFollow}><FormField label="跟进状态"><NativeSelect bare label="跟进状态" allowEmpty={false} value={follow.feedback} onChange={(value) => setFollow({ ...follow, feedback: value })} options={["跟进中", "已反馈", "未反馈"]} /></FormField><FormField label="迁移意向"><NativeSelect bare label="迁移意向" allowEmpty={false} value={follow.intent} onChange={(value) => setFollow({ ...follow, intent: value })} options={["有迁出意向", "观望中", "无迁出意向"]} /></FormField><FormField label="意向地区"><Input value={follow.destination} onChange={(event) => setFollow({ ...follow, destination: event.target.value })} placeholder="选填，例如苏州" /></FormField><FormField label="跟进记录"><Textarea value={follow.note} onChange={(event) => setFollow({ ...follow, note: event.target.value })} placeholder="记录企业反馈、服务诉求与下一步安排" /></FormField></FormDialog>
    <Dialog open={ruleOpen} onOpenChange={setRuleOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>迁移预警规则</DialogTitle><DialogDescription>规则变更写入 MySQL 并形成操作审计</DialogDescription></DialogHeader>{usesDefaultRules && <InlineError message="当前使用系统默认预警规则，保存后将写入数据库并替换默认配置。" />}<div className="rule-configuration-list">{ruleDraft.map((rule, index) => <label key={rule.name}><span className="rule-index">{String(index + 1).padStart(2, "0")}</span><span><strong>{rule.name}</strong><small>{rule.desc}</small></span><input type="checkbox" checked={rule.on} onChange={() => setRuleDraft((current) => current.map((item) => item.name === rule.name ? { ...item, on: !item.on } : item))} /></label>)}</div><div className="operation-brief-actions"><Button variant="outline" onClick={() => setRuleOpen(false)}>取消</Button><ActionButton action="编辑" onClick={async () => { try { const existing = ruleData.rows.find((row) => row.id === "migration-rules"); if (existing) await ruleData.updateRecord(existing.id, { rules: ruleDraft }); else await ruleData.createRecord({ rules: ruleDraft } as Omit<Row, "id">); setRuleOpen(false); toast.success("预警规则已保存到 MySQL"); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "规则保存失败"); } }}>保存规则</ActionButton></div></DialogContent></Dialog></div>;
}

function RiskDetail({ row, rules, onFollow, onCreateVisit }: { row: Row; rules: Array<{ name: string; on: boolean }>; onFollow: () => void; onCreateVisit: () => void }) {
  const signals = [{ name: "招聘岗位数量", value: "近 3 个月变化", level: row.risk === "高风险" ? "高" : "中", reference: true }, { name: "社保缴纳人数", value: "近 6 个月变化", level: row.risk === "高风险" ? "高" : "低", reference: true }, { name: "办公场地租约", value: "剩余租期监测", level: "中", reference: true }, { name: "对外投资新增", value: row.pull, level: "中", reference: false }, { name: "风险规则", value: `${rules.filter((rule) => rule.on).length} 项规则启用`, level: "低", reference: false }];
  return <div className="risk-detail"><div className="risk-score-panel"><StatusValue value={row.risk} /><strong>{row.score}</strong><span>综合风险评分</span></div><dl className="business-detail-list"><div><dt>主导因素</dt><dd>{row.drive}</dd></div><div><dt>推力动因</dt><dd>{row.push}</dd></div><div><dt>拉力动因</dt><dd>{row.pull}</dd></div><div><dt>所属园区</dt><dd>{row.park}</dd></div><div><dt>意向地区</dt><dd>{row.intent}</dd></div><div><dt>企业反馈</dt><dd>{row.feedback}</dd></div></dl><PageSection title="风险信号" description="综合经营与外部扩张信息"><div className="risk-signal-list">{signals.map((signal) => <div key={signal.name}><span>{signal.name}</span><strong>{signal.value}</strong>{signal.reference && <em className="risk-reference-tag">参考指标</em>}<StatusValue value={signal.level} /></div>)}</div></PageSection><div className="table-action-buttons"><ActionButton action="编辑" onClick={onFollow}>记录跟进反馈</ActionButton><ActionButton action="新增" target="/myCampus/visitManage/index" variant="outline" onClick={onCreateVisit}>转为走访督办</ActionButton></div></div>;
}
