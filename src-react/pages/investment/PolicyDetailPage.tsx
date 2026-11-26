import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { policies } from "../../../src/data/mock.js";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { PageHeading, PageSection, StatusValue } from "@/pages/PagePrimitives";
import { readStoredIds } from "./policyDetails";
import { PolicyDetails } from "./policyDetails";

type Row = Record<string, any> & { id: string | number };

const FOLLOWS_KEY = "youshu-policy-follows";

export function PolicyDetailPage() {
  const { id = "" } = useParams();
  const collection = useBusinessCollection<Row>({ key: "youshu-policies", seed: policies, apiCollection: "policies" });
  const row = collection.rows.find((item) => String(item.id) === id);
  const navigate = useNavigate();
  const location = useLocation();
  const [followed, setFollowed] = useState(() => readStoredIds(FOLLOWS_KEY).includes(id));
  const back = () => (location.key === "default" ? navigate("/policy/index") : navigate(-1));
  if (collection.loading) {
    return (
      <div className="business-page">
        <PageHeading title="政策详情" source={collection.source} />
        <PageSection>
          <div className="business-loading">
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </PageSection>
      </div>
    );
  }
  if (!row) {
    return (
      <div className="business-page">
        <PageHeading title="政策详情" source={collection.source} />
        <PageSection>
          <div className="business-empty-hint">
            <strong>未找到该政策</strong>
            <span>政策可能已下线，或当前链接中的编号有误。</span>
            <Button variant="outline" onClick={back}>返回政策列表</Button>
          </div>
        </PageSection>
      </div>
    );
  }
  return (
    <div className="business-page">
      <PageHeading title="政策详情" description="查看政策适用范围、申报条件与材料" source={collection.source} actions={<Button variant="outline" onClick={back}>返回列表</Button>} />
      <PageSection title={row.name} description={`${row.org} · ${row.level} · ${row.district}`}>
        <PolicyDetails row={row} />
        <div className="business-detail-actions">
          <StatusValue value={row.status} />
          <span>申报截止 {row.deadline}</span>
          <Button
            onClick={() => {
              const current = readStoredIds(FOLLOWS_KEY);
              const next = followed ? current.filter((item) => item !== id) : [...new Set([...current, id])];
              localStorage.setItem(FOLLOWS_KEY, JSON.stringify(next));
              setFollowed(!followed);
              toast.success(followed ? "已取消政策关注" : "已加入政策关注");
            }}
          >
            {followed ? "已关注政策" : "关注政策"}
          </Button>
        </div>
      </PageSection>
    </div>
  );
}
