import { useReportExport } from "@/app/ReportQueue";
import { ActionButton } from "@/app/AccessContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DataTable, type DataColumn } from "@/../src/components/shared/DataTable";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { api } from "../../../src/api.js";
import { PageHeading, PageSection, SearchField, SectionTabs, StatusValue } from "@/pages/PagePrimitives";
import { Activity, Download, Timer, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

type Row = Record<string, any> & { id: string | number };
type Metrics = { totalCalls: number; todayCalls: number; monthCalls: number; successRate: number; averageDuration: number; failures: number; dailyThreshold: number; monthlyThreshold: number; dailyWarning: boolean; monthlyWarning: boolean; departments: Row[]; modules: Row[] };

export function InterfaceMonitoringPage() {
  const enqueue = useReportExport();
  const [tab, setTab] = useState("modules");
  const [keyword, setKeyword] = useState("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api.interfaceMetrics().then((value: Metrics) => { setMetrics(value); setError(""); })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "监控数据暂不可用"));
  }, []);
  const baseRows = tab === "modules" ? metrics?.modules ?? [] : metrics?.departments ?? [];
  const rows = baseRows.filter((row) => !keyword || String(row.name).includes(keyword));
  const columns: DataColumn<Row>[] = [
    { key: "name", header: tab === "modules" ? "业务模块" : "所属部门", sortable: true },
    { key: "count", header: "调用总量", sortable: true },
    { key: "failures", header: "异常次数", sortable: true, cell: (row) => <StatusValue value={row.failures ? `${row.failures} 次异常` : "无异常"} /> },
    { key: "averageDuration", header: "平均耗时", sortable: true, cell: (row) => `${row.averageDuration} ms` },
  ];

  return <div className="business-page">
    <PageHeading title="数据服务与接口监控" description="仅统计内部委办局和工作台模块的调用总量、成功率、耗时与异常" source={error ? "unavailable" : metrics ? "server" : "loading"} actions={<ActionButton action="导出" variant="outline" onClick={() => enqueue("内部接口监控.csv", columns.map((column) => ({ header: column.header, value: (row: Row) => row[column.key] })), rows)}><Download data-icon="inline-start" />导出监控数据</ActionButton>} />
    {error && <Alert variant="destructive"><TriangleAlert /><AlertTitle>监控数据暂不可用</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
    {metrics?.dailyWarning && <Alert><TriangleAlert /><AlertTitle>每日调用量已达到预警阈值</AlertTitle><AlertDescription>今日 {metrics.todayCalls.toLocaleString()} 次，阈值 {metrics.dailyThreshold.toLocaleString()} 次。</AlertDescription></Alert>}
    {metrics?.monthlyWarning && <Alert><TriangleAlert /><AlertTitle>月度调用量已达到预警阈值</AlertTitle><AlertDescription>本月 {metrics.monthCalls.toLocaleString()} 次，阈值 {metrics.monthlyThreshold.toLocaleString()} 次。</AlertDescription></Alert>}
    <div className="business-metric-grid">
      <MetricCard title="累计调用" value={metrics?.totalCalls.toLocaleString() ?? "—"} description="MySQL 操作审计汇总" icon={<Activity />} />
      <MetricCard title="今日调用" value={metrics?.todayCalls.toLocaleString() ?? "—"} description={`预警阈值 ${metrics?.dailyThreshold.toLocaleString() ?? "—"}`} />
      <MetricCard title="本月调用" value={metrics?.monthCalls.toLocaleString() ?? "—"} description={`预警阈值 ${metrics?.monthlyThreshold.toLocaleString() ?? "—"}`} />
      <MetricCard title="调用成功率" value={metrics ? `${metrics.successRate}%` : "—"} description={`${metrics?.failures ?? 0} 次失败请求`} />
      <MetricCard title="平均耗时" value={metrics ? `${metrics.averageDuration} ms` : "—"} description="按审计请求记录计算" icon={<Timer />} />
    </div>
    <PageSection title="部门与模块调用明细" description="按业务模块、响应状态和耗时查看内部接口运行情况">
      <SectionTabs items={[{ key: "modules", label: "按模块", count: metrics?.modules.length ?? 0 }, { key: "departments", label: "按部门", count: metrics?.departments.length ?? 0 }]} value={tab} onChange={setTab} />
      <div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="搜索部门或业务模块" /></div>
      <DataTable columns={columns} data={rows} detailTitle="接口调用汇总" />
    </PageSection>
  </div>;
}
