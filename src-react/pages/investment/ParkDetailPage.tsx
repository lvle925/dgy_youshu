import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { industriesShort, parks } from "../../../src/data/mock.js";
import { PageHeading, PageSection } from "@/pages/PagePrimitives";

type Row = Record<string, any> & { id: string | number };

export function ParkDetailPage() {
  const { rows, loading, source } = useBusinessCollection<Row>({ key: "youshu-parks-buildings", seed: parks, apiCollection: "parksBuildings" });
  const { id = "" } = useParams();
  const park = rows.find((item) => String(item.id) === id);
  const navigate = useNavigate();
  if (!park) return <div className="business-page"><PageHeading title="园区详情" source={source} /><PageSection title={loading ? "正在加载园区" : "未找到园区"}><Button onClick={() => navigate("/parksBuildings/index")}>返回园区楼宇</Button></PageSection></div>;
  return <div className="business-page"><PageHeading title="园区详情" description="空间载体、运营概况与企业服务信息" source={source} actions={<Button variant="outline" onClick={() => navigate("/parksBuildings/index")}>返回园区楼宇</Button>} /><div className="business-metric-grid"><MetricCard title="建筑面积" value={park.area} description="园区空间规模" /><MetricCard title="楼宇数量" value={park.buildings} description="可持续维护" /><MetricCard title="入驻企业" value={park.enterprises} description="园区经营主体" /><MetricCard title="入驻率" value={`${park.occupancy}%`} description="当前空间利用率" /></div><PageSection title={park.name} description={`${park.district} · ${park.address}`}><p>{park.intro}</p><div className="business-contact-grid"><div><span>运营负责人</span><strong>{park.manager}</strong></div><div><span>服务电话</span><strong>{park.phone}</strong></div><div><span>园区类型</span><strong>{park.type}</strong></div><div><span>产业方向</span><strong>{industriesShort.slice(0, 3).join("、")}</strong></div></div></PageSection><PageSection title="园区运营" description="演示数据暂未拆分楼宇与企业成员明细"><Button onClick={() => navigate("/myCampus/campusAdmin/index")}>打开园区管理</Button></PageSection></div>;
}
