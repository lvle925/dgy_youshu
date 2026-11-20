import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageHeading, PageSection } from "@/pages/PagePrimitives";

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="business-page">
      <PageHeading title="页面不存在" description="当前地址没有对应的工作台页面。" />
      <PageSection>
        <div className="business-empty-hint">
          <strong>404</strong>
          <Button onClick={() => navigate("/home/index")}>返回首页</Button>
        </div>
      </PageSection>
    </div>
  );
}
