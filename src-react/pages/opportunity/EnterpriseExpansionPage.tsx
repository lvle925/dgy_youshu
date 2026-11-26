import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/../src/components/shared/DataTable";
import { ChipFilter, matchesChipFilter, type ChipFilterValue } from "@/../src/components/shared/ChipFilter";
import { StatusTag } from "@/../src/components/shared/StatusTag";
import { StatBar } from "@/../src/components/shared/StatBar";
import { FormField, NativeSelect, PageHeading, PageSection } from "@/pages/PagePrimitives";
import { expansionSignals, expansionDemands, expansionSources } from "@/../src/mocks/expansion";

const groups = [
  { key: "demands", label: "扩张需求", options: expansionDemands },
  { key: "signals", label: "扩张线索", options: expansionSources },
];
const scoreRanges = ["0–20", "21–40", "41–60", "61–80", "81–100", "自定义"];
const contains = (input: string, query: string) => input.toLowerCase().includes(query.trim().toLowerCase());

export default function EnterpriseExpansionPage() {
  const [filter, setFilter] = useState<ChipFilterValue>({});
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [product, setProduct] = useState("");
  const [region, setRegion] = useState("");
  const [range, setRange] = useState("");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [minInvestment, setMinInvestment] = useState("");
  const [minOutput, setMinOutput] = useState("");
  const [maxInvestment, setMaxInvestment] = useState("");
  const [maxOutput, setMaxOutput] = useState("");
  const [lower, upper] = range === "自定义" ? [Number(minScore || 0), Number(maxScore || 100)]
    : range ? range.split("–").map(Number) : [0, 100];
  const filtered = expansionSignals.filter(row =>
    matchesChipFilter(row, groups, filter, (item, key) => key === "demands" ? item.demands : item.signals) &&
    contains(row.company + " " + row.intent, keyword) && contains(row.product, product) &&
    contains(row.target, region) && row.score >= lower && row.score <= upper &&
    row.investment >= Number(minInvestment || 0) && row.investment <= Number(maxInvestment || Infinity) &&
    row.output >= Number(minOutput || 0) && row.output <= Number(maxOutput || Infinity));
  const active = !!(keyword || product || region || range || minScore || maxScore || minInvestment || maxInvestment || minOutput || maxOutput || Object.values(filter).some(items => items.length));
  const invalidInvestment = Number(minInvestment || 0) > Number(maxInvestment || Infinity);
  const invalidOutput = Number(minOutput || 0) > Number(maxOutput || Infinity);
  const invalidScore = Number(minScore || 0) > Number(maxScore || 100);

  function reset() {
    setFilter({}); setKeyword(""); setProduct(""); setRegion(""); setRange("");
    setMinScore(""); setMaxScore(""); setMinInvestment(""); setMaxInvestment(""); setMinOutput(""); setMaxOutput("");
  }

  return <div className="business-page">
    <PageHeading title="企业扩张" description="按企业产品、扩张需求和投资计划筛选企业扩张线索" />
    <PageSection title="扩张筛选">
      <div className="business-form-grid">
        <FormField label="扩张关键词"><Input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="企业名称或扩张意向" /></FormField>
        <FormField label="产品服务"><Input value={product} onChange={e => setProduct(e.target.value)} placeholder="产品、服务或行业" /></FormField>
        <FormField label="目标区域"><Input value={region} onChange={e => setRegion(e.target.value)} placeholder="输入计划落地区域" /></FormField>
        <NativeSelect label="扩张意愿度" value={range} onChange={setRange} options={scoreRanges} />
        <div className="business-form-actions"><Button variant="outline" onClick={() => setAdvancedOpen(current => !current)}>{advancedOpen ? "收起高级筛选" : "展开高级筛选"}</Button><Button variant="ghost" onClick={reset}>重置筛选</Button></div>
        {advancedOpen && <>
          {range === "自定义" && <>
            <FormField label="意愿度下限"><Input type="number" min={0} max={100} value={minScore} onChange={e => setMinScore(e.target.value)} /></FormField>
            <FormField label="意愿度上限"><Input type="number" min={0} max={100} value={maxScore} onChange={e => setMaxScore(e.target.value)} /></FormField>
            {invalidScore && <p className="business-range-hint">意愿度下限不能大于上限。</p>}
          </>}
          <FormField label="投资规模下限（万元）"><Input type="number" min={0} value={minInvestment} onChange={e => setMinInvestment(e.target.value)} /></FormField>
          <FormField label="投资规模上限（万元）"><Input type="number" min={0} value={maxInvestment} onChange={e => setMaxInvestment(e.target.value)} /></FormField>
          {invalidInvestment && <p className="business-range-hint">投资规模下限不能大于上限。</p>}
          <FormField label="产值预估下限（万元）"><Input type="number" min={0} value={minOutput} onChange={e => setMinOutput(e.target.value)} /></FormField>
          <FormField label="产值预估上限（万元）"><Input type="number" min={0} value={maxOutput} onChange={e => setMaxOutput(e.target.value)} /></FormField>
          {invalidOutput && <p className="business-range-hint">产值预估下限不能大于上限。</p>}
        </>}
      </div>
      <ChipFilter groups={groups} value={filter} onChange={setFilter} />
    </PageSection>
    <StatBar scope={active ? "当前筛选结果" : "全库总量"} items={[
      { label: "企业扩张信号", value: filtered.length },
      { label: "高意愿 · 80 分及以上", value: filtered.filter(row => row.score >= 80).length },
      { label: "中意愿 · 60–79 分", value: filtered.filter(row => row.score >= 60 && row.score < 80).length },
      { label: "低意愿 · 60 分以下", value: filtered.filter(row => row.score < 60).length },
      { label: "预计投资", value: filtered.reduce((sum, row) => sum + row.investment, 0).toLocaleString(), suffix: "万元" },
    ]} />
    <PageSection title="扩张线索">
      <DataTable data={filtered} detailTitle="企业扩张线索" defaultSort={{ key: "score", direction: "desc" }} columns={[
        { key: "company", header: "企业名称", sortable: true },
        { key: "product", header: "产品服务" },
        { key: "intent", header: "扩张意向" },
        { key: "score", header: "扩张意愿度", sortable: true, cell: row => <StatusTag value={row.score + " 分"} tone={row.score >= 80 ? "danger" : row.score >= 60 ? "warning" : "neutral"} /> },
        { key: "demands", header: "扩张需求", cell: row => row.demands.join("、") },
        { key: "target", header: "目标区域" },
        { key: "investment", header: "投资 / 产值（万元）", sortable: true, cell: row => row.investment.toLocaleString() + " / " + row.output.toLocaleString() },
        { key: "signals", header: "扩张线索", cell: row => row.signals.join("、") },
      ]} />
    </PageSection>
  </div>;
}
