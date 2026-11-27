import { ActionButton } from "@/app/AccessContext";
import { useReportExport } from "@/app/ReportQueue";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Building2, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataColumn } from "@/../src/components/shared/DataTable";
import { FilterDrawer } from "@/../src/components/shared/FilterDrawer";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { companies, districts, industriesShort } from "../../../src/data/mock.js";
import { PageHeading, PageSection, SearchField } from "@/pages/PagePrimitives";
import { CompanySummary } from "./companySummary";

type Row = Record<string, any> & { id: string | number };

export function CompanySearchPage() {
  const enqueue = useReportExport();
  const location = useLocation();
  const [keyword, setKeyword] = useState(() => String((location.state as { keyword?: string } | null)?.keyword ?? ""));
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [compare, setCompare] = useState<Row[]>([]);
  const navigate = useNavigate();
  const groups = [
    { key: "industry", label: "所属行业", options: industriesShort },
    { key: "scale", label: "企业规模", options: ["微型", "小型", "中型", "大型", "超大型"] },
    { key: "district", label: "所在区域", options: districts },
    { key: "tags", label: "企业标签", options: ["高新技术企业", "专精特新", "上市企业", "独角兽", "创新型企业"] },
  ];
  const rows = (companies as Row[]).filter((row) => (!keyword || `${row.name} ${row.code}`.includes(keyword)) && groups.every((group) => !filters[group.key]?.length || filters[group.key].some((item) => (Array.isArray(row[group.key]) ? row[group.key] : [row[group.key]]).includes(item))));
  const selectedConditions = groups.flatMap((group) => (filters[group.key] ?? []).map((item) => ({ group, item })));
  const columns: DataColumn<Row>[] = [{ key: "name", header: "企业名称", sortable: true, cell: (row) => <button className="business-link" onClick={() => navigate(`/subsidy/company/${row.id}`)}>{row.name}</button> }, { key: "industry", header: "所属行业" }, { key: "scale", header: "企业规模" }, { key: "district", header: "所在区域" }, { key: "socialSecurity", header: "社保人数", sortable: true }, { key: "regCapital", header: "注册资本" }, { key: "tags", header: "企业标签", cell: (row) => <span>{(row.tags ?? []).join("、")}</span> }, { key: "compare", header: "对比", cell: (row) => <Button size="sm" variant="outline" onClick={() => toggleCompare(row)}>{compare.some((item) => item.id === row.id) ? "已加入" : "加入对比"}</Button> }];
  function toggleCompare(row: Row) {
    if (compare.some((item) => item.id === row.id)) {
      setCompare((current) => current.filter((item) => item.id !== row.id));
      return;
    }
    if (compare.length >= 4) {
      toast.warning("最多对比 4 家企业");
      return;
    }
    setCompare((current) => [...current, row]);
  }
  function removeCondition(groupKey: string, item: string) {
    setFilters((current) => ({ ...current, [groupKey]: (current[groupKey] ?? []).filter((value) => value !== item) }));
  }
  return <div className="business-page">
    <PageHeading title="企业查询" description="搜索企业并查看工商概况、产业标签和园区分布" actions={<ActionButton action="导出" variant="outline" onClick={() => enqueue("企业名录.csv", [{ header: "企业名称", value: row => row.name }, { header: "行业", value: row => row.industry }, { header: "区域", value: row => row.district }, { header: "注册资本", value: row => row.regCapital }], rows)}>导出企业</ActionButton>} />
    <div className="business-metric-grid"><MetricCard title="企业总量" value="3,105" description="当前地区企业库" icon={<Building2 />} emphasis="primary" hint="企业库口径" /><MetricCard title="高新技术企业" value="862" description="重点科技企业" variant="surface" /><MetricCard title="专精特新企业" value="426" description="创新型企业" variant="surface" /><MetricCard title="近一年新增" value="186" description="企业注册与迁入" variant="surface" delta={8.6} /></div>
    <PageSection title="企业名录" description={`找到 ${rows.length} 家企业`}>
      <div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="企业名称或统一社会信用代码" /><Button variant="outline" onClick={() => setDrawerOpen(true)}><Filter data-icon="inline-start" />高级筛选{selectedConditions.length > 0 && <Badge variant="secondary">{selectedConditions.length}</Badge>}</Button>{compare.length > 0 && <Button onClick={() => document.getElementById("company-compare")?.scrollIntoView({ behavior: "smooth" })}>对比 {compare.length} 家</Button>}</div>
      {selectedConditions.length > 0 && <div className="business-chip-row">
        {selectedConditions.map(({ group, item }) => <button key={`${group.key}-${item}`} type="button" className="chip-filter-selected-chip" onClick={() => removeCondition(group.key, item)}>{group.label}：{item}<X aria-hidden="true" /></button>)}
        <Button variant="ghost" size="sm" onClick={() => setFilters({})}>清空条件</Button>
      </div>}
      <DataTable columns={columns} data={rows} detailTitle="企业摘要" renderDetails={(row) => <CompanySummary row={row} />} />
    </PageSection>
    {compare.length > 0 && <PageSection title="企业对比" description="最多选择 4 家企业进行横向比较">
      <div id="company-compare" className="compare-table" style={{ gridTemplateColumns: `110px repeat(${compare.length}, minmax(120px, 1fr))` }}>
        <div className="compare-label">企业名称</div>
        {compare.map((row) => <div key={row.id} className="compare-title"><strong>{row.shortName || row.name}</strong><button type="button" aria-label={`移出对比 ${row.name}`} onClick={() => toggleCompare(row)}><X aria-hidden="true" /></button></div>)}
        <div className="compare-label">所属行业</div>
        {compare.map((row) => <span key={row.id}>{row.industry}</span>)}
        <div className="compare-label">企业规模</div>
        {compare.map((row) => <span key={row.id}>{row.scale}</span>)}
        <div className="compare-label">社保人数</div>
        {compare.map((row) => <span key={row.id}>{row.socialSecurity} 人</span>)}
        <div className="compare-label">注册资本</div>
        {compare.map((row) => <span key={row.id}>{row.regCapital}</span>)}
        <div className="compare-label">园区</div>
        {compare.map((row) => <span key={row.id}>{row.park}</span>)}
      </div>
      <Button variant="outline" onClick={() => setCompare([])}>清空对比</Button>
    </PageSection>}
    <FilterDrawer open={drawerOpen} onOpenChange={setDrawerOpen} title="企业高级筛选" groups={groups} value={filters} onChange={setFilters} onQuery={() => setDrawerOpen(false)} onReset={() => setFilters({})} />
  </div>;
}
