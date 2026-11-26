import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ActionButton, useAllowedAction } from "@/app/AccessContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { clues } from "../../../src/data/mock.js";
import { api } from "../../../src/api.js";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { PageHeading, PageSection, StatusValue } from "@/pages/PagePrimitives";
import { toast } from "sonner";

type Row = Record<string, any> & { id: string | number };

const stages = ["线索摸排", "研判评审", "载体选址匹配", "拟签约", "落地纳统"];

export function ClueDetailPage() {
  const { id = "" } = useParams();
  const data = useBusinessCollection<Row>({ key: "youshu-clues", seed: clues, apiCollection: "clues" });
  const row = data.rows.find((item) => String(item.id) === id);
  const navigate = useNavigate();
  const location = useLocation();
  const canViewSensitive = useAllowedAction("查看敏感信息");
  const [sensitiveContact, setSensitiveContact] = useState<{ contact: string; phone: string } | null>(null);
  const back = () => (location.key === "default" ? navigate("/business/projectCluesUpdate/index") : navigate(-1));

  async function revealContact() {
    if (!row) return;
    try {
      const contact = await api.sensitiveProjectContact(row.id);
      setSensitiveContact({ contact: contact.contact || "未登记", phone: contact.phone || "未登记" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法查阅敏感信息");
    }
  }

  if (data.loading) {
    return <div className="business-page"><PageHeading title="线索详情" source={data.source} /><PageSection><div className="business-loading"><Skeleton className="h-5 w-1/3" /><Skeleton className="h-3 w-1/4" /><Skeleton className="h-28 w-full" /><Skeleton className="h-20 w-full" /></div></PageSection></div>;
  }

  if (!row) {
    return <div className="business-page"><PageHeading title="线索详情" source={data.source} /><PageSection><div className="business-empty-hint"><strong>未找到该线索</strong><span>链接中的线索编号不存在，或当前账号没有访问权限。</span><Button variant="outline" onClick={back}>返回线索列表</Button></div></PageSection></div>;
  }

  const activeIndex = stages.indexOf(row.stage || stages[0]);
  return <div className="business-page">
    <PageHeading title="线索详情" description="企业扩张线索、投资意向与当前跟进状态" source={data.source} actions={<Button variant="outline" onClick={back}>返回线索列表</Button>} />
    <PageSection title={row.company} description={`${row.region} · ${row.industry}`}>
      <div className="business-detail-intro">{row.desc}</div>
      <dl className="business-detail-list">
        <div><dt>扩张意向</dt><dd>{row.intent}</dd></div>
        <div><dt>线索来源</dt><dd>{row.source}</dd></div>
        <div><dt>意愿等级</dt><dd>{row.level} · {row.score} 分</dd></div>
        <div><dt>推荐园区</dt><dd>{row.park}</dd></div>
        <div><dt>联系人</dt><dd>{sensitiveContact ? `${sensitiveContact.contact} · ${sensitiveContact.phone}` : `${row.contact || "未登记"} · ${row.phone || "未登记"}（按权限查阅完整号码）`}{canViewSensitive && !sensitiveContact && <ActionButton className="ml-3" size="sm" variant="outline" action="查看敏感信息" onClick={() => void revealContact()}>查看完整号码</ActionButton>}</dd></div>
        <div><dt>跟进状态</dt><dd><StatusValue value={row.status} /></dd></div>
      </dl>
      <section className="project-stage-timeline" aria-label="项目推进时间轴">
        <h3>政务项目推进时间轴</h3>
        <ol>{stages.map((stage, index) => {
          const event = (row.history ?? []).find((item: Row) => item.to === stage);
          return <li className={index <= activeIndex ? "is-complete" : ""} key={stage}><span>{stage}</span><small>{event?.time ? new Date(event.time).toLocaleString("zh-CN") : index === activeIndex ? "当前阶段" : "待推进"}</small></li>;
        })}</ol>
      </section>
    </PageSection>
    <PageSection title="跟进动态" description="记录企业联系与项目推进过程"><p>{row.note || "暂无跟进动态"}</p></PageSection>
  </div>;
}
