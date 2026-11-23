import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Search } from "lucide-react";
import { DataTable } from "@/../src/components/shared/DataTable";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { logStatSeries, logs } from "../../../src/data/mock.js";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { PageHeading, PageSection } from "@/pages/PagePrimitives";
import { normalizedLogs } from "./normalizedLogs";

type Row = Record<string, any> & { id: string | number };

export function MemberLogStatisticsPage() {
  const data = useBusinessCollection<Row>({ key: "youshu-operation-logs-v2", seed: normalizedLogs });
  const series = logStatSeries.map((item, index) => ({ ...item, id: `log-stat-${index}` }));
  const byOperator = Object.entries(data.rows.reduce((totals: Record<string, number>, row) => { const key = String(row.operator ?? "其他"); totals[key] = (totals[key] ?? 0) + 1; return totals; }, {})).map(([name, value]) => ({ name, value }));
  const typeData = Object.entries(data.rows.reduce((totals: Record<string, number>, row) => { const key = String(row.type ?? "其他"); totals[key] = (totals[key] ?? 0) + 1; return totals; }, {})).map(([name, value]) => ({ name, value }));
  return <div className="business-page"><PageHeading title="操作日志统计" description="查看平台操作量趋势、操作人员分布和事件类型" source={data.source} /><div className="business-metric-grid"><MetricCard title="日志总量" value={data.rows.length.toLocaleString()} description="留存审计记录" icon={<Search />} /><MetricCard title="活跃操作人" value={byOperator.length} description="统计范围内" /><MetricCard title="今日操作" value={data.rows.filter((row) => String(row.time).startsWith(new Date().toISOString().slice(0, 10))).length} description="按本机日期统计" /><MetricCard title="操作类型" value={typeData.length} description="覆盖平台业务事件" /></div><div className="business-chart-grid"><PageSection title="近 7 日操作趋势"><div className="business-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={series}><CartesianGrid vertical={false} stroke="#e7ebf0" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Bar dataKey="count" name="操作次数" fill="#1652B8" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></PageSection><PageSection title="事件类型分布"><div className="business-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={typeData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={90}>{typeData.map((item, index) => <Cell key={item.name} fill={["#1652B8", "#147A4C", "#C8922E", "#5C8ED5", "#64748B"][index % 5]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></PageSection></div><PageSection title="操作人排行" description="按审计记录数量排序"><DataTable columns={[{ key: "name", header: "操作人" }, { key: "value", header: "操作次数", sortable: true }]} data={byOperator.map((item, index) => ({ ...item, id: `operator-${index}` }))} /></PageSection></div>;
}
