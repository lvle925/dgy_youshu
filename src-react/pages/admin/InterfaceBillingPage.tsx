import { useReportExport } from "@/app/ReportQueue";
import { ActionButton } from "@/app/AccessContext";
import { useState } from "react";
import { Download, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/../src/components/shared/DataTable";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { StatusTag } from "@/../src/components/shared/StatusTag";
import { billing } from "../../../src/data/mock.js";
import { NativeSelect, PageHeading, PageSection, SearchField, SectionTabs, StatusValue } from "@/pages/PagePrimitives";

type Row = Record<string, any> & { id: string | number };

export function InterfaceBillingPage() {
  const enqueue = useReportExport();
  const [tab, setTab] = useState("usage");
  const [keyword, setKeyword] = useState("");
  const [period, setPeriod] = useState("本月");
  const rows = (billing.records as Row[]).filter((row) => !keyword || `${row.item} ${row.type}`.includes(keyword));
  return <div className="business-page"><PageHeading title="接口计费" description="查看接口调用量、账户余额、计费明细和套餐信息" actions={<><Button variant="outline" onClick={() => toast.info("本地演示环境暂不支持账户充值")}>账户充值</Button><ActionButton action="导出" variant="outline" onClick={() => enqueue("接口账单.csv", [{ header: "接口", value: row => row.item }, { header: "类型", value: row => row.type }, { header: "时间", value: row => row.date }], rows)}><Download data-icon="inline-start" />导出账单</ActionButton></>} /><div className="business-metric-grid"><MetricCard title="账户余额" value={`¥ ${billing.balance.toLocaleString()}`} description={`${billing.plan} · 到期 ${billing.expire}`} variant="gradient" icon={<KeyRound />} /><MetricCard title="本月已用" value={`¥ ${billing.monthlyUsage.toLocaleString()}`} description="按接口请求计费" /><MetricCard title="接口调用量" value={billing.apiCalls.toLocaleString()} description="本统计周期" /><MetricCard title="成功率" value={`${billing.successRate}%`} description="调用成功请求占比" /></div><PageSection title="计费明细" description="查看接口调用、充值与到账记录"><SectionTabs items={[{ key: "usage", label: "计费明细", count: billing.records.length }, { key: "apis", label: "已开通接口" }, { key: "keys", label: "接口密钥" }]} value={tab} onChange={setTab} />{tab === "usage" && <><div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="接口名称或账单类型" /><NativeSelect label="统计周期" value={period} onChange={setPeriod} options={["本月", "上月", "近 90 天", "本年度"]} /></div><DataTable columns={[{ key: "date", header: "发生时间", sortable: true }, { key: "type", header: "类型", cell: (row) => <StatusValue value={row.type} /> }, { key: "item", header: "接口 / 项目名称" }, { key: "count", header: "调用次数", sortable: true }, { key: "amount", header: "发生金额", sortable: true, cell: (row) => `¥ ${Number(row.amount).toFixed(2)}` }, { key: "status", header: "状态", cell: (row) => <StatusValue value={row.status} /> }]} data={rows} detailTitle="账单记录" /></>}{tab === "apis" && <div className="billing-api-grid">{["企业工商信息查询", "企业风险信息查询", "政策数据同步", "企业图谱查询", "招投标数据查询"].map((name, index) => <article key={name}><span className="api-product-icon">API</span><strong>{name}</strong><p>接口调用服务 · {index % 2 ? "按次计费" : "套餐额度内"}</p><StatusTag value="已开通" tone="success" /><Button variant="outline" size="sm" onClick={() => toast.info(`${name} 契约详情暂未配置`)}>查看接口</Button></article>)}</div>}{tab === "keys" && <div className="billing-key-panel"><KeyRound /><div><strong>接口密钥</strong><p>密钥由平台管理员在真实计费服务中配置。演示环境不展示或生成真实凭据。</p></div><StatusTag value="未配置" tone="neutral" /></div>}</PageSection></div>;
}
