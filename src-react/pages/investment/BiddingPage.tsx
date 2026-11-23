import { useState } from "react";
import { Layers3 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/../src/components/shared/DataTable";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { biddingRows, biddingRecommend, biddingCompanies } from "../../../src/data/mock.js";
import { NativeSelect, PageHeading, PageSection, SearchField, StatusValue } from "@/pages/PagePrimitives";

type Row = Record<string, any> & { id: string | number };

export function BiddingPage() {
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState("");
  const rows = (biddingRows as Row[]).filter((row) => (!keyword || `${row.title} ${row.buyer}`.includes(keyword)) && (!type || row.type === type));
  const companyRows = (biddingCompanies as unknown as Row[]).map((row, index) => ({ ...row, id: `bid-company-${index}` }));
  return <div className="business-page"><PageHeading title="招投标查询" description="跟踪园区建设、产业服务和重点企业采购机会" /><div className="business-metric-grid"><MetricCard title="近期公告" value={biddingRows.length} description="近 30 天发布" icon={<Layers3 />} /><MetricCard title="报名中" value={biddingRows.filter((row) => row.status === "报名中").length} description="仍可参与" /><MetricCard title="重点推荐" value={biddingRecommend.length} description="与园区业务匹配" /><MetricCard title="活跃中标方" value={biddingCompanies.length} description="本地供应链企业" /></div><PageSection title="招投标公告" description={`共 ${rows.length} 条`}><div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="搜索项目名称或采购方" /><NativeSelect label="公告类型" value={type} onChange={setType} options={["招标公告", "中标公告"]} /></div><DataTable columns={[{ key: "title", header: "项目名称", sortable: true }, { key: "type", header: "公告类型", cell: (row) => <StatusValue value={row.type} /> }, { key: "buyer", header: "采购单位" }, { key: "budget", header: "预算金额", sortable: true }, { key: "region", header: "项目地区" }, { key: "date", header: "发布日期", sortable: true }, { key: "deadline", header: "投标截止" }, { key: "status", header: "状态", cell: (row) => <StatusValue value={row.status} /> }]} data={rows} detailTitle="招投标项目" /></PageSection><div className="business-chart-grid"><PageSection title="匹配推荐"><div className="recommend-list">{biddingRecommend.map((row) => <div key={row.id}><span><b>{row.match}</b> 分</span><div><strong>{row.title}</strong><small>{row.buyer} · {row.budget}</small></div><Button size="sm" variant="outline" onClick={() => toast.success("已关注该招标机会")}>关注</Button></div>)}</div></PageSection><PageSection title="活跃中标企业"><DataTable columns={[{ key: "name", header: "企业名称" }, { key: "industry", header: "所属行业" }, { key: "count", header: "中标次数", sortable: true }]} data={companyRows} /></PageSection></div></div>;
}
