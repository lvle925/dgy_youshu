import { ActionButton } from "@/app/AccessContext";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, Building2, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { companies, industryChainTree } from "../../../src/data/mock.js";
import { PageHeading, PageSection, SectionTabs } from "@/pages/PagePrimitives";

type Row = Record<string, any> & { id: string | number };

const palette = ["#1652B8", "#147A4C", "#C8922E", "#5C8ED5", "#64748B"];

export function IndustryChartPage() {
  const [industry, setIndustry] = useState("人工智能");
  const [selected, setSelected] = useState<Row | null>(null);
  const layers: Row[] = (industryChainTree.children as unknown as Row[]).map((layer, index) => ({ ...layer, id: `industry-layer-${index}` }));
  const distribution = [
    { name: "大型", value: 68 }, { name: "中型", value: 42 }, { name: "小型", value: 56 }, { name: "微型", value: 28 },
  ];
  const districtsData = [{ name: "浦东", value: 680 }, { name: "徐汇", value: 420 }, { name: "闵行", value: 310 }, { name: "杨浦", value: 260 }, { name: "嘉定", value: 210 }, { name: "松江", value: 186 }];
  return <div className="business-page">
    <PageHeading title="产业图谱" description="沿产业链查看上中下游环节、代表企业与区域分布" actions={<><Button variant="outline" onClick={() => toast.success("图谱数据已刷新") }><RefreshCw data-icon="inline-start" />刷新数据</Button><ActionButton action="导出" variant="outline" onClick={() => toast.success("图谱导出已准备")}><Download data-icon="inline-start" />导出图谱</ActionButton></>} />
    <div className="business-metric-grid"><MetricCard title="产业链企业总数" value="2,386" description="覆盖 3 个产业层级" icon={<Building2 />} /><MetricCard title="链主企业" value="32" description="带动上下游协同" variant="surface" /><MetricCard title="专精特新企业" value="186" description="重点创新企业" variant="surface" /><MetricCard title="近一年新增" value="264" description="企业节点增量" variant="surface" delta={12.4} /></div>
    <PageSection title="产业链结构" description={`${industry}产业链 · 点击节点查看企业明细`}>
      <SectionTabs items={["人工智能", "生物医药", "集成电路", "新能源汽车", "高端装备"].map((name) => ({ key: name, label: name }))} value={industry} onChange={setIndustry} />
      <div className="industry-layers">{layers.map((layer, index) => <section className="industry-layer" key={layer.name}><div className="industry-layer-heading"><span>{index + 1}</span><h3>{layer.name}</h3><small>{layer.children.length} 个产业环节</small></div><div className="industry-node-grid">{(layer.children as Row[]).map((node) => <button key={node.name} type="button" className="industry-node" onClick={() => setSelected({ ...node, layer: layer.name })}><strong>{node.name}</strong><span>{node.count} 家企业</span><div className="industry-node-meter"><i style={{ width: `${Math.max(14, Math.min(100, Number(node.count) / 2.2))}%` }} /></div><small>{(node.companies as string[]).slice(0, 2).join(" · ")}</small></button>)}</div>{index < layers.length - 1 && <div className="industry-flow"><ArrowDown /></div>}</section>)}</div>
    </PageSection>
    <div className="business-chart-grid"><PageSection title="企业规模分布"><div className="business-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distribution} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2}>{distribution.map((entry, index) => <Cell key={entry.name} fill={palette[index % palette.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></PageSection><PageSection title="各区产业链企业分布"><div className="business-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={districtsData} margin={{ left: 2, right: 12, top: 12, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7ebf0" /><XAxis dataKey="name" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="value" name="企业数" radius={[4, 4, 0, 0]}>{districtsData.map((entry, index) => <Cell key={entry.name} fill={palette[index % palette.length]} />)}</Bar></BarChart></ResponsiveContainer></div></PageSection></div>
    <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><SheetContent side="right" className="business-detail-sheet"><SheetHeader><SheetTitle>{selected?.name} · 企业明细</SheetTitle><SheetDescription>{selected?.layer} · 共 {selected?.count} 家企业</SheetDescription></SheetHeader>{selected && <div className="business-company-list">{(selected.companies as string[]).map((name, index) => <div key={name} className="business-company-item"><span>{index + 1}</span><div><strong>{name}</strong><small>{selected.name} · {index % 2 ? "高成长企业" : "链上重点企业"}</small></div><Button size="sm" variant="ghost" onClick={() => toast.info(`已打开 ${name} 企业信息`)}>查看</Button></div>)}</div>}</SheetContent></Sheet>
  </div>;
}
