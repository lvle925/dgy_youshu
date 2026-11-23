import { api } from "../../../src/api.js";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { DataTable } from "@/../src/components/shared/DataTable";
import { PageHeading, PageSection } from "@/pages/PagePrimitives";
import { Activity, AlertTriangle, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Aggregate = { total: number; today: number; exceptions: number; trend: Array<{ date: string; count: number }>; distribution: Array<{ name: string; count: number }>; operators: Array<{ name: string; count: number }> };
const chartPalette = ["#1652B8", "#147A4C", "#C8922E", "#5C8ED5", "#64748B"];

export function MemberLogStatisticsPage() {
  const [stats, setStats] = useState<Aggregate | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api.auditStatistics().then((value: Aggregate) => { setStats(value); setError(""); })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "日志统计加载失败"));
  }, []);
  const trend = useMemo(() => {
    const byDate = new Map((stats?.trend ?? []).map((item) => [item.date, item.count]));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return { date: key.slice(5), count: byDate.get(key) ?? 0 };
    });
  }, [stats?.trend]);
  return <div className="business-page">
    <PageHeading title="操作日志统计" description={error || "指标、趋势和高频事件分布由 MySQL op_log 聚合计算"} source={error ? "unavailable" : stats ? "server" : "loading"} />
    <div className="business-metric-grid">
      <MetricCard title="日志总量" value={stats?.total.toLocaleString() ?? "—"} description="全量审计事件" icon={<Search />} />
      <MetricCard title="今日操作" value={stats?.today.toLocaleString() ?? "—"} description="按政务工作台本地日期" />
      <MetricCard title="异常次数" value={stats?.exceptions.toLocaleString() ?? "—"} description="登录失败与业务请求失败" icon={<AlertTriangle />} />
      <MetricCard title="操作人员" value={stats?.operators.length ?? "—"} description="有审计事件的操作人" icon={<Activity />} />
    </div>
    <div className="business-chart-grid">
      <PageSection title="近 7 日审计趋势" description="按 op_log.occurred_at 聚合">
        <div className="business-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={trend}><CartesianGrid vertical={false} stroke="#e7ebf0" /><XAxis dataKey="date" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" name="操作次数" fill="#1652B8" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </PageSection>
      <PageSection title="高频操作分布" description="按真实审计动作统计">
        <div className="business-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats?.distribution ?? []} dataKey="count" nameKey="name" innerRadius={54} outerRadius={90}>{(stats?.distribution ?? []).map((item, index) => <Cell key={item.name} fill={chartPalette[index % chartPalette.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
      </PageSection>
    </div>
    <PageSection title="操作人员排行" description="按 MySQL 审计事件数量排序"><DataTable columns={[{ key: "name", header: "操作人" }, { key: "count", header: "操作次数", sortable: true }]} data={(stats?.operators ?? []).map((item) => ({ ...item, id: item.name }))} /></PageSection>
  </div>;
}
