import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { PageSection } from "@/pages/PagePrimitives";
import { OutboundSetup } from "./OutboundSetup";
import { useOutboundRecords } from "./outboundRecords";

export default function AiOutboundDashboardPage() {
  return <OutboundSetup title="外呼数据看板"><CallMetrics /></OutboundSetup>;
}

function CallMetrics() {
  const { rows, error } = useOutboundRecords();
  const connected = rows.filter(row => row.result !== "未接通").length;
  const interested = rows.filter(row => row.result === "有意向").length;
  const counts = new Map<string, { date: string; called: number; connected: number }>();
  for (const row of rows) {
    const date = row.time.slice(0, 10);
    const day = counts.get(date) ?? { date, called: 0, connected: 0 };
    day.called++;
    if (row.result !== "未接通") day.connected++;
    counts.set(date, day);
  }
  const trend = [...counts.values()].sort((a, b) => a.date.localeCompare(b.date));
  return <>
    <div className="business-metric-grid">
      <MetricCard title="累计拨打" value={rows.length} />
      <MetricCard title="接通率" value={rows.length ? (connected / rows.length * 100).toFixed(1) + "%" : "—"} />
      <MetricCard title="有意向" value={interested} />
      <MetricCard title="接通意向率" value={connected ? (interested / connected * 100).toFixed(1) + "%" : "—"} />
    </div>
    <PageSection title="外呼趋势" description={error || "按通话记录日期汇总"}>
      {trend.length ? <div className="business-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={trend}>
        <CartesianGrid vertical={false} strokeDasharray="3 4" /><XAxis dataKey="date" /><YAxis allowDecimals={false} /><Tooltip /><Legend />
        <Bar dataKey="called" name="拨打" fill="#1652B8" radius={[4, 4, 0, 0]} />
        <Bar dataKey="connected" name="接通" fill="#147A4C" radius={[4, 4, 0, 0]} />
      </BarChart></ResponsiveContainer></div> : <p className="business-empty-hint">当前地区暂无通话记录</p>}
    </PageSection>
  </>;
}
