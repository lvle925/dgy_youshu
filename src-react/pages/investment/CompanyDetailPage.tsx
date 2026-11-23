import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/../src/components/shared/DataTable";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { StatusTag } from "@/../src/components/shared/StatusTag";
import { companies, policies, migrationEnterprises, visitRecords } from "../../../src/data/mock.js";
import { PageHeading, PageSection, SectionTabs, StatusValue } from "@/pages/PagePrimitives";
import { CompanySummary } from "./companySummary";

type Row = Record<string, any> & { id: string | number };

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
