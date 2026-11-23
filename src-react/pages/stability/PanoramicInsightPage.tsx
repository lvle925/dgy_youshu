import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DataTable, type DataColumn } from "@/../src/components/shared/DataTable";
import { OperationBriefDialog } from "@/components/shared/OperationBriefDialog";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { campusList, companies, clues, migrationEnterprises } from "../../../src/data/mock.js";
import { useCurrentCity } from "@/app/CityContext";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { NativeSelect, PageHeading, PageSection, StatusValue } from "@/pages/PagePrimitives";

type Row = Record<string, any> & { id: string | number };

const chartPalette = ["#1652B8", "#147A4C", "#C8922E", "#5C8ED5", "#64748B"];
const emptyRequests: Row[] = [];

function belongsToCity(row: Row, city: string) {
  const location = String(row.city ?? row.targetCity ?? row.region ?? row.district ?? "");
  return location ? location.includes(city) || city.includes(location) || city === "上海市" : city === "上海市";
}

export function PanoramicInsightPage() {
  const { city } = useCurrentCity();
  const [district, setDistrict] = useState("");
  const campusData = useBusinessCollection<Row>({ key: "youshu-campus-list", seed: campusList, apiCollection: "campusList" });
  const archiveData = useBusinessCollection<Row>({ key: "youshu-company-archives", seed: (companies as Row[]).map((row, index) => ({ ...row, archiveStatus: index === 9 ? "已迁出" : index === 19 ? "已消失" : "正常经营" })), apiCollection: "companyArchives" });
  const clueData = useBusinessCollection<Row>({ key: "youshu-clues", seed: clues as Row[], apiCollection: "clues" });
  const requestData = useBusinessCollection<Row>({ key: "youshu-service-requests", seed: emptyRequests, apiCollection: "serviceRequests" });
  const migrationData = useBusinessCollection<Row>({ key: "youshu-migration-enterprises", seed: migrationEnterprises as Row[], apiCollection: "migrationWarnings" });

  const campusRows = useMemo(() => campusData.rows.filter((row) => belongsToCity(row, city)), [campusData.rows, city]);
  const archiveRows = useMemo(() => archiveData.rows.filter((row) => belongsToCity(row, city)), [archiveData.rows, city]);
  const clueRows = useMemo(() => clueData.rows.filter((row) => belongsToCity(row, city)), [clueData.rows, city]);
  const requestRows = useMemo(() => requestData.rows.filter((row) => belongsToCity(row, city)), [requestData.rows, city]);
  const migrationRows = useMemo(() => migrationData.rows.filter((row) => belongsToCity(row, city)), [migrationData.rows, city]);
  const districts = useMemo(() => [...new Set(campusRows.map((row) => String(row.district ?? "")).filter(Boolean))].sort(), [campusRows]);
  const parksView = campusRows.filter((row) => !district || row.district === district);
  const requestClosed = requestRows.filter((row) => row.status === "已办结").length;
  const openRequests = requestRows.filter((row) => row.status !== "已办结").length;
  const retentionCount = archiveRows.filter((row) => row.archiveStatus === "正常经营").length;
  const retentionRate = archiveRows.length ? `${Math.round(retentionCount * 1000 / archiveRows.length) / 10}%` : "—";
  const resolutionRate = requestRows.length ? `${Math.round(requestClosed * 1000 / requestRows.length) / 10}%` : "—";
  const stats = [
    { label: "企业档案", value: archiveRows.length.toLocaleString(), description: "当前数据范围", variant: "gradient" as const },
    { label: "园区载体", value: campusRows.length.toLocaleString(), description: "已入库载体" },
    { label: "在跟招商项目", value: clueRows.filter((row) => row.status !== "已搁置").length.toLocaleString(), description: "项目线索台账" },
    { label: "迁移预警企业", value: migrationRows.length.toLocaleString(), description: `高风险 ${migrationRows.filter((row) => row.risk === "高风险").length} 家` },
    { label: "在办企业诉求", value: openRequests.toLocaleString(), description: "待派单与办理中" },
    { label: "诉求办结率", value: resolutionRate, description: `企业留存率 ${retentionRate}` },
  ];
  const stageDistribution = useMemo(() => {
    const stages = ["线索摸排", "研判评审", "载体选址匹配", "拟签约", "落地纳统"];
    return stages.map((stage) => ({ name: stage, count: clueRows.filter((row) => (row.stage || stages[0]) === stage).length }));
  }, [clueRows]);
  const industryDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    archiveRows.forEach((row) => {
      const industry = String(row.industry || "其他");
      counts.set(industry, (counts.get(industry) ?? 0) + 1);
    });
    return [...counts.entries()].map(([name, value]) => ({ name, value })).sort((left, right) => right.value - left.value).slice(0, 5);
  }, [archiveRows]);
  const columns: DataColumn<Row>[] = [
    { key: "name", header: "园区名称" },
    { key: "buildings", header: "楼宇数", sortable: true },
    { key: "enterprises", header: "入驻企业", sortable: true },
    { key: "area", header: "载体面积" },
    { key: "occupancy", header: "入驻率", sortable: true, cell: (row) => `${row.occupancy}%` },
    { key: "status", header: "运营状态", cell: (row) => <StatusValue value={row.status} /> },
  ];

  return <div className="business-page">
    <PageHeading title="全景洞察" description={`${city} · 招商项目、企业服务与迁移预警运行情况`} source={campusData.source} actions={<><OperationBriefDialog /><NativeSelect label="所在区域" value={district} onChange={setDistrict} options={districts} /></>} />
    <div className="business-metric-grid six">{stats.map((item) => <MetricCard key={item.label} title={item.label} value={item.value} description={item.description} variant={item.variant ?? "surface"} />)}</div>
    <div className="business-chart-grid">
      <PageSection title="招商项目推进阶段" description="来自当前城市的项目线索台账">
        {clueRows.length ? <div className="business-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={stageDistribution} margin={{ left: 0, right: 12, top: 8, bottom: 8 }}><CartesianGrid vertical={false} stroke="#e7ebf0" strokeDasharray="3 5" /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} /><Tooltip /><Bar dataKey="count" name="项目数" fill={chartPalette[0]} radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div> : <p className="business-empty-hint">当前城市暂无项目线索</p>}
      </PageSection>
      <PageSection title="企业产业结构" description="按企业档案中的行业分类统计">
        {industryDistribution.length ? <div className="business-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={industryDistribution} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92}>{industryDistribution.map((item, index) => <Cell key={item.name} fill={chartPalette[index % chartPalette.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div> : <p className="business-empty-hint">当前城市暂无企业档案</p>}
      </PageSection>
    </div>
    <PageSection title="园区运行监测" description={`${city} · 企业诉求 ${requestRows.length} 项，其中已办结 ${requestClosed} 项`}>
      <div className="business-toolbar"><NativeSelect label="区域" value={district} onChange={setDistrict} options={districts} /></div>
      <DataTable columns={columns} data={parksView} detailTitle="园区运行概况" />
    </PageSection>
  </div>;
}
