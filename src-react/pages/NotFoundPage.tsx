import { useNavigate } from "react-router-dom";
import { Compass, Home, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeading, PageSection } from "@/pages/PagePrimitives";

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="business-page">
      <PageHeading title="页面不存在" description="当前地址没有对应的工作台页面。" />
      <PageSection>
        <div className="business-empty-hint not-found-hint">
          <Compass aria-hidden="true" />
          <strong>404 · 未找到该页面</strong>
          <span>可能是地址输入有误、页面已调整，或当前账号没有访问该模块的权限。</span>
          <div className="not-found-actions">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <RotateCcw data-icon="inline-start" />
              返回上一页
            </Button>
            <Button onClick={() => navigate("/home/index")}>
              <Home data-icon="inline-start" />
              返回首页
            </Button>
          </div>
        </div>
      </PageSection>
    </div>
  );
}
