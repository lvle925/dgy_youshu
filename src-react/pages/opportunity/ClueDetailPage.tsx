import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ActionButton, useAllowedAction } from "@/app/AccessContext";
import { Button } from "@/components/ui/button";
import { clues } from "../../../src/data/mock.js";
import { api } from "../../../src/api.js";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { PageHeading, PageSection, StatusValue } from "@/pages/PagePrimitives";
import { toast } from "sonner";

type Row = Record<string, any> & { id: string | number };

export function ClueDetailPage() {
  const { id = "" } = useParams();
  const data = useBusinessCollection<Row>({ key: "youshu-clues", seed: clues, apiCollection: "clues" });
  const row = data.rows.find((item) => String(item.id) === id);
  const navigate = useNavigate();
  const canViewSensitive = useAllowedAction("查看敏感信息");
  const [sensitiveContact, setSensitiveContact] = useState<{ contact: string; phone: string } | null>(null);

  async function revealContact() {
    if (!row) return;
    try {
      const contact = await api.sensitiveProjectContact(row.id);
      setSensitiveContact({ contact: contact.contact || "未登记", phone: contact.phone || "未登记" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法查阅敏感信息");
    }
  }

  return <div className="business-page"><PageHeading title="线索详情" description="企业扩张线索、投资意向与当前跟进状态" source={data.source} actions={<Button variant="outline" onClick={() => navigate("/business/projectCluesUpdate/index")}>返回线索列表</Button>} />{row ? <><PageSection title={row.company} description={`${row.region} · ${row.industry}`}><div className="business-detail-intro">{row.desc}</div><dl className="business-detail-list"><div><dt>扩张意向</dt><dd>{row.intent}</dd></div><div><dt>线索来源</dt><dd>{row.source}</dd></div><div><dt>意愿等级</dt><dd>{row.level} · {row.score} 分</dd></div><div><dt>推荐园区</dt><dd>{row.park}</dd></div><div><dt>联系人</dt><dd>{sensitiveContact ? `${sensitiveContact.contact} · ${sensitiveContact.phone}` : `${row.contact || "未登记"} · ${row.phone || "未登记"}（按权限查阅完整号码）`}{canViewSensitive && !sensitiveContact && <ActionButton className="ml-3" size="sm" variant="outline" action="查看敏感信息" onClick={() => void revealContact()}>查看完整号码</ActionButton>}</dd></div><div><dt>跟进状态</dt><dd><StatusValue value={row.status} /></dd></div></dl></PageSection><PageSection title="跟进动态" description="记录企业联系与项目推进过程"><p>{row.note || "暂无跟进动态"}</p></PageSection></> : <PageSection><p>{data.loading ? "正在加载线索…" : "未找到该线索"}</p></PageSection>}</div>;
}
