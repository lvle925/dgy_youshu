import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { PageSection, InlineError } from "@/pages/PagePrimitives";
import { OutboundSetup } from "./OutboundSetup";
import { useOutboundRecords } from "./outboundRecords";
import { Skeleton } from "@/components/ui/skeleton";

export default function AiOutboundDashboardPage() {
  return <OutboundSetup title="外呼数据看板"><CallMetrics /></OutboundSetup>;
}

function fillRecentDays(trend: Array<{ date: string; called: number; connected: number; interested: number }>) {
  const days = 14;
  const filled: Array<{ date: string; called: number; connected: number; interested: number }> = [];
  const today = new Date();
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(today.getTime() - offset * 86_400_000);
    const key = date.toLocaleDateString("sv-SE");
    const hit = trend.find((item) => item.date === key);
    filled.push({ date: key.slice(5), called: hit?.called ?? 0, connected: hit?.connected ?? 0, interested: hit?.interested ?? 0 });
  }
  return filled;
}

function CallMetrics() {
  const { rows, error, loading } = useOutboundRecords();
  const connected = rows.filter(row => row.result !== "未接通").length;
  const interested = rows.filter(row => row.result === "有意向").length;
  const counts = new Map<string, { date: string; called: number; connected: number; interested: number }>();
  for (const row of rows) {
    const date = row.time.slice(0, 10);
    const day = counts.get(date) ?? { date, called: 0, connected: 0, interested: 0 };
    day.called++;
    if (row.result !== "未接通") day.connected++;
    if (row.result === "有意向") day.interested++;
    counts.set(date, day);
  }
  const trend = fillRecentDays([...counts.values()].sort((a, b) => a.date.localeCompare(b.date)));
  const resultStats = [...new Set(rows.map(row => row.result))].map(result => ({ result, count: rows.filter(row => row.result === result).length }));
  if (loading) {
    return <PageSection title="外呼数据看板"><div className="business-loading"><Skeleton className="h-5 w-1/4" /><Skeleton className="h-32 w-full" /></div></PageSection>;
  }
  if (error) {
    return <PageSection title="外呼数据看板" error={error} onRetry={() => window.location.reload()} />;
  }
  return <>
    <div className="business-metric-grid">
      <MetricCard title="累计拨打" value={rows.length} />
      <MetricCard title="接通率" value={rows.length ? (connected / rows.length * 100).toFixed(1) + "%" : "—"} />
      <MetricCard title="有意向" value={interested} />
      <MetricCard title="接通意向率" value={connected ? (interested / connected * 100).toFixed(1) + "%" : "—"} />
    </div>
    <PageSection title="外呼趋势" description="按通话记录日期汇总，近 14 天缺失日期按 0 补齐">
      {rows.length ? <div className="business-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={trend}>
        <CartesianGrid vertical={false} strokeDasharray="3 4" /><XAxis dataKey="date" /><YAxis allowDecimals={false} /><Tooltip /><Legend />
        <Bar dataKey="called" name="拨打" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="connected" name="接通" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="interested" name="有意向" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
      </BarChart></ResponsiveContainer></div> : <p className="business-empty-hint">当前地区暂无通话记录</p>}
    </PageSection>
    <PageSection title="沟通结果分布" description="按通话记录结果汇总">
      {resultStats.length ? <div className="business-rule-cards">
        {resultStats.map(item => <div key={item.result}><strong>{item.result}</strong><span>{item.count} 次 · 占 {rows.length ? Math.round(item.count / rows.length * 100) : 0}%</span></div>)}
      </div> : <InlineError message="当前地区暂无沟通结果数据。" />}
    </PageSection>
  </>;
}
