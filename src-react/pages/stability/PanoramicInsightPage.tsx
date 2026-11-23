import { useState } from "react";
import { CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DataTable, type DataColumn } from "@/../src/components/shared/DataTable";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { campusList, districts, panoramicStats, parks } from "../../../src/data/mock.js";
import { NativeSelect, PageHeading, PageSection, StatusValue } from "@/pages/PagePrimitives";

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
