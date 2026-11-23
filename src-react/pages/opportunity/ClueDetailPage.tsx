import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { clues } from "../../../src/data/mock.js";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { PageHeading, PageSection, StatusValue } from "@/pages/PagePrimitives";

type Row = Record<string, any> & { id: string | number };

export function ClueDetailPage() {
  const { id = "" } = useParams();
  const data = useBusinessCollection<Row>({ key: "youshu-clues", seed: clues, apiCollection: "clues" });
  const row = data.rows.find((item) => String(item.id) === id);
  const navigate = useNavigate();
  return <div className="business-page"><PageHeading title="线索详情" description="企业扩张线索、投资意向与当前跟进状态" actions={<Button variant="outline" onClick={() => navigate("/business/projectCluesUpdate/index")}>返回线索列表</Button>} />{row ? <><PageSection title={row.company} description={`${row.region} · ${row.industry}`}><div className="business-detail-intro">{row.desc}</div><dl className="business-detail-list"><div><dt>扩张意向</dt><dd>{row.intent}</dd></div><div><dt>线索来源</dt><dd>{row.source}</dd></div><div><dt>意愿等级</dt><dd>{row.level} · {row.score} 分</dd></div><div><dt>推荐园区</dt><dd>{row.park}</dd></div><div><dt>联系人</dt><dd>{row.contact ? row.contact + " · " + row.phone : "请在项目线索池解锁"}</dd></div><div><dt>跟进状态</dt><dd><StatusValue value={row.status} /></dd></div></dl></PageSection><PageSection title="跟进动态" description="记录企业联系与项目推进过程"><p>{row.note || "暂无跟进动态"}</p></PageSection></> : <PageSection><p>{data.loading ? "正在加载线索…" : "未找到该线索"}</p></PageSection>}</div>;
}
