import { ActionButton } from "@/app/AccessContext";
import { useReportExport } from "@/app/ReportQueue";
import { Button } from "@/components/ui/button";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { DataTable, type DataColumn } from "@/../src/components/shared/DataTable";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { SectionTabs, PageHeading, PageSection } from "@/pages/PagePrimitives";
import { industryChainTree } from "../../../src/data/mock.js";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArrowDown, Building2, Download, RefreshCw } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMemo, useState } from "react";

type Row = Record<string, any> & { id: string | number };
const palette = ["#1652B8", "#147A4C", "#C8922E", "#5C8ED5", "#64748B"];

export function IndustryChartPage() {
  const data = useBusinessCollection<Row>({ key: "youshu-industry-nodes", seed: flattenSeed(industryChainTree as unknown as Row), apiCollection: "industryNodes" });
  const enqueue = useReportExport();
  const roots = data.rows.filter((row) => !row.parentId);
  const [industry, setIndustry] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const activeRoot = roots.find((row) => row.name === industry) ?? roots[0];
  const layers = useMemo(() => data.rows.filter((row) => String(row.parentId ?? "") === String(activeRoot?.id ?? "")), [data.rows, activeRoot?.id]);
  const leafNodes = data.rows.filter((row) => !data.rows.some((child) => String(child.parentId ?? "") === String(row.id)));
  const enterpriseCount = leafNodes.reduce((sum, row) => sum + Number(row.count ?? 0), 0);
  const companyNames = [...new Set(data.rows.flatMap((row) => Array.isArray(row.companies) ? row.companies as string[] : []))];
  const layerSummary = layers.map((layer) => ({ ...layer, id: String(layer.id), value: data.rows.filter((row) => String(row.parentId ?? "") === String(layer.id)).reduce((sum, row) => sum + Number(row.count ?? 0), 0) }));
  const columns: DataColumn<Row>[] = [{ key: "name", header: "产业环节", sortable: true }, { key: "count", header: "关联企业", sortable: true }, { key: "parentId", header: "所属层级", cell: (row) => data.rows.find((item) => String(item.id) === String(row.parentId))?.name ?? activeRoot?.name ?? "产业链" }];
  const exportRows = data.rows.map((row) => ({ industry: row.industry, layer: data.rows.find((item) => String(item.id) === String(row.parentId))?.name ?? "产业链", name: row.name, count: row.count, companies: Array.isArray(row.companies) ? row.companies.join("、") : "" }));

  return <div className="business-page">
    <PageHeading title="产业图谱" description="沿产业链查看上中下游环节、代表企业和产业节点" source={data.source} actions={<>
      <Button variant="outline" onClick={() => void data.refresh()}><RefreshCw data-icon="inline-start" />刷新数据</Button>
      <ActionButton action="导出" variant="outline" onClick={() => enqueue("产业图谱.csv", [{ header: "产业", value: (row) => row.industry }, { header: "产业层级", value: (row) => row.layer }, { header: "产业环节", value: (row) => row.name }, { header: "企业数量", value: (row) => row.count }, { header: "代表企业", value: (row) => row.companies }], exportRows)}><Download data-icon="inline-start" />导出台账</ActionButton>
    </>} />
    <div className="business-metric-grid"><MetricCard title="产业链企业节点" value={enterpriseCount.toLocaleString()} description={`${roots.length} 个已登记产业链`} icon={<Building2 />} /><MetricCard title="产业层级" value={layers.length} description={`${activeRoot?.name || "当前产业"} 的一级环节`} /><MetricCard title="代表企业" value={companyNames.length} description="产业链节点登记企业" /></div>
    <PageSection title="产业链结构" description="产业层级与代表企业来自 MySQL 产业节点台账">
      {roots.length > 0 && <SectionTabs items={roots.map((root) => ({ key: String(root.name), label: String(root.name) }))} value={activeRoot?.name ?? ""} onChange={setIndustry} />}
      <div className="industry-layers">{layers.map((layer, index) => {
        const nodes = data.rows.filter((node) => String(node.parentId ?? "") === String(layer.id));
        return <section className="industry-layer" key={layer.id}>
          <div className="industry-layer-heading"><span>{String(index + 1).padStart(2, "0")}</span><h3>{layer.name}</h3><small>{nodes.length} 个产业节点</small></div>
          <div className="industry-node-grid">{nodes.map((node) => <button key={node.id} type="button" className="industry-node" onClick={() => setSelected({ ...node, layer: layer.name })}><strong>{node.name}</strong><span>{Number(node.count ?? 0).toLocaleString()} 家企业</span><div className="industry-node-meter"><i style={{ width: `${Math.max(14, Math.min(100, Number(node.count ?? 0) / 2.2))}%` }} /></div><small>{(node.companies as string[] ?? []).slice(0, 2).join(" · ") || "代表企业待补充"}</small></button>)}</div>
          {index < layers.length - 1 && <div className="industry-flow"><ArrowDown /></div>}
        </section>;
      })}</div>
      {layers.length === 0 && <p className="text-muted-foreground">当前城市暂无产业图谱记录</p>}
    </PageSection>
    <div className="business-chart-grid">
      <PageSection title="产业层级分布"><div className="business-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={layerSummary} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2}>{layerSummary.map((entry, index) => <Cell key={entry.id} fill={palette[index % palette.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></PageSection>
      <PageSection title="各层产业节点企业数"><div className="business-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={layerSummary} margin={{ left: 2, right: 12, top: 12, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7ebf0" /><XAxis dataKey="name" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="value" name="企业数" radius={[4, 4, 0, 0]}>{layerSummary.map((entry, index) => <Cell key={entry.id} fill={palette[index % palette.length]} />)}</Bar></BarChart></ResponsiveContainer></div></PageSection>
    </div>
    <PageSection title="产业节点台账" description={`当前产业 ${activeRoot?.name ?? "—"} · 共 ${exportRows.filter((row) => row.industry === activeRoot?.name).length} 个节点`}><DataTable columns={columns} data={data.rows.filter((row) => row.industry === activeRoot?.name)} openRowDetails={false} onRowClick={setSelected} /></PageSection>
    <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><SheetContent side="right" className="business-detail-sheet"><SheetHeader><SheetTitle>{selected?.name} · 产业节点</SheetTitle><SheetDescription>{selected?.industry} · {selected?.layer}</SheetDescription></SheetHeader>{selected && <div className="business-company-list">{(selected.companies as string[] ?? []).map((name, index) => <div key={name} className="business-company-item"><span>{index + 1}</span><div><strong>{name}</strong><small>{selected.name} · 产业链登记企业</small></div></div>)}{!(selected.companies as string[] ?? []).length && <p className="text-muted-foreground">当前节点尚未登记代表企业。</p>}</div>}</SheetContent></Sheet>
  </div>;
}

function flattenSeed(root: Row): Row[] {
  const result: Row[] = [];
  function visit(node: Row, parentId = "", industry = String(root.name)) {
    const id = String(node.id ?? `seed-${result.length + 1}`);
    result.push({ ...node, id, parentId, industry });
    (node.children ?? []).forEach((child: Row) => visit(child, id, industry));
  }
  visit(root);
  return result;
}
