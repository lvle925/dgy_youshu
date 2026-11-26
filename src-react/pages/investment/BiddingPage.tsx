import { DataTable, type DataColumn } from "@/../src/components/shared/DataTable";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { Button } from "@/components/ui/button";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { NativeSelect, PageHeading, PageSection, SearchField, StatusValue } from "@/pages/PagePrimitives";
import { biddingRows } from "../../../src/data/mock.js";
import { Layers3 } from "lucide-react";
import { useMemo, useState } from "react";

type Row = Record<string, any> & { id: string | number };

export function BiddingPage() {
  const data = useBusinessCollection<Row>({ key: "youshu-bidding-records", seed: biddingRows, apiCollection: "biddingRecords" });
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState("");
  const rows = data.rows.filter((row) => {
    const needle = keyword.trim().toLowerCase();
    const hit = !needle || `${row.title ?? ""} ${row.buyer ?? ""} ${row.region ?? ""}`.toLowerCase().includes(needle);
    return hit && (!type || row.type === type);
  });
  const hasFilter = Boolean(keyword.trim() || type);
  const topNotices = useMemo(() => rows.filter((row) => row.type === "招标公告" && row.status === "报名中").slice(0, 4), [rows]);
  const buyerRows = useMemo(() => {
    const buyers = new Map<string, number>();
    data.rows.forEach((row) => buyers.set(String(row.buyer ?? "未登记"), (buyers.get(String(row.buyer ?? "未登记")) ?? 0) + 1));
    return [...buyers.entries()].map(([name, count]) => ({ id: name, name, count, industry: "招投标采购单位" }));
  }, [data.rows]);
  const columns: DataColumn<Row>[] = [
    { key: "title", header: "项目名称", sortable: true },
    { key: "type", header: "公告类型", cell: (row) => <StatusValue value={row.type} /> },
    { key: "buyer", header: "采购单位" },
    { key: "budget", header: "预算金额", sortable: true },
    { key: "region", header: "项目地区" },
    { key: "date", header: "发布日期", sortable: true },
    { key: "deadline", header: "投标截止" },
    { key: "status", header: "状态", cell: (row) => <StatusValue value={row.status} /> },
  ];
  return <div className="business-page">
    <PageHeading title="招投标查询" description="查询园区建设、产业服务和重点企业采购公告" source={data.source} />
    <div className="business-metric-grid">
      <MetricCard title="公告记录" value={data.rows.length} description="当前持久化台账" icon={<Layers3 />} />
      <MetricCard title="报名中" value={data.rows.filter((row) => row.status === "报名中").length} description="仍处于报名期" />
      <MetricCard title="即将截止" value={data.rows.filter((row) => row.status === "即将截止").length} description="需关注投标节点" />
      <MetricCard title="采购单位" value={buyerRows.length} description="按公告数据去重" />
    </div>
    <PageSection title="招投标公告" description={`筛选结果 ${rows.length} 条`}>
      <div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="搜索项目名称、采购单位或项目地区" /><NativeSelect label="公告类型" value={type} onChange={setType} options={["招标公告", "中标公告"]} />{hasFilter && <Button variant="ghost" onClick={() => { setKeyword(""); setType(""); }}>重置筛选</Button>}</div>
      <DataTable columns={columns} data={rows} detailTitle="招投标项目" onResetFilters={hasFilter ? () => { setKeyword(""); setType(""); } : undefined} emptyText="没有符合条件的招投标公告" />
    </PageSection>
    <div className="business-chart-grid">
      <PageSection title="当前可报名公告" description={`${hasFilter ? "当前筛选结果中" : "全部公告中"}仍开放报名的项目`}>
        <div className="recommend-list">{topNotices.length ? topNotices.map((row) => <div key={row.id}><StatusValue value={row.status} /><div><strong>{row.title}</strong><small>{row.buyer} · {row.budget} · 截止 {row.deadline || "待补充"}</small></div></div>) : <p className="text-muted-foreground">当前筛选范围暂无开放报名公告</p>}</div>
      </PageSection>
      <PageSection title="采购单位分布" description="根据已登记公告记录汇总">
        <DataTable columns={[{ key: "name", header: "采购单位", sortable: true }, { key: "industry", header: "数据类型" }, { key: "count", header: "公告数量", sortable: true }]} data={buyerRows} />
      </PageSection>
    </div>
  </div>;
}
