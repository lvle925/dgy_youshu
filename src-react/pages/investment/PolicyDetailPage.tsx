import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { policies } from "../../../src/data/mock.js";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { PageHeading, PageSection, StatusValue } from "@/pages/PagePrimitives";
import { readStoredIds } from "./policyDetails";
import { PolicyDetails } from "./policyDetails";

type Row = Record<string, any> & { id: string | number };

export function PolicyDetailPage() {
  const { id = "" } = useParams();
  const collection = useBusinessCollection<Row>({ key: "youshu-policies", seed: policies, apiCollection: "policies" });
  const row = collection.rows.find((item) => String(item.id) === id);
  const navigate = useNavigate();
  const [followed, setFollowed] = useState(() => readStoredIds("youshu-policy-follows").includes(id));
  if (!row) return <div className="business-page"><PageHeading title="政策详情" source={collection.source} /><PageSection><div className="business-empty-hint">{collection.loading ? "正在加载政策" : "未找到该政策"}<Button variant="outline" onClick={() => navigate("/policy/index")}>返回政策列表</Button></div></PageSection></div>;
  return <div className="business-page"><PageHeading title="政策详情" description="查看政策适用范围、申报条件与材料" source={collection.source} actions={<Button variant="outline" onClick={() => navigate("/policy/index")}>返回列表</Button>} /><PageSection title={row.name} description={`${row.org} · ${row.level} · ${row.district}`}><PolicyDetails row={row} /><div className="business-detail-actions"><StatusValue value={row.status} /><span>申报截止 {row.deadline}</span><Button onClick={() => { const current = readStoredIds("youshu-policy-follows"); const next = followed ? current.filter((item) => item !== id) : [...new Set([...current, id])]; localStorage.setItem("youshu-policy-follows", JSON.stringify(next)); setFollowed(!followed); toast.success(followed ? "已取消政策关注" : "已加入政策关注"); }}>{followed ? "已关注政策" : "关注政策"}</Button></div></PageSection></div>;
}
