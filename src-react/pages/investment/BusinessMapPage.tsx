import { ActionButton } from "@/app/AccessContext";
import { toast } from "sonner";
import { api } from "../../../src/api.js";
import { useState } from "react";
import { MapPin, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { companies, mapMarkers } from "../../../src/data/mock.js";
import { PageHeading, PageSection, NativeSelect, SearchField, SectionTabs } from "@/pages/PagePrimitives";
import { containsPoint, SpatialMap, type Boundary, type ParkPoint } from "@/components/SpatialMap";
import { useCurrentCity } from "@/app/CityContext";
import { isShanghaiArea, regionMatches } from "@/lib/cityData";

export function BusinessMapPage() {
  const { city } = useCurrentCity();
  return <CityMap key={city} city={city} />;
}

function CityMap({ city }: { city: string }) {
  const [keyword, setKeyword] = useState("");
  const [district, setDistrict] = useState("");
  const [industry, setIndustry] = useState("");
  const [tab, setTab] = useState("parks");
  const [boundary, setBoundary] = useState<Boundary | null>(null);
  const [selected, setSelected] = useState<ParkPoint | null>(null);
  const markers = isShanghaiArea(city) ? mapMarkers.filter(marker => city === "上海市" || regionMatches(marker.district, city)) : [];
  const matchingMarkers = markers.filter(park => (!district || district === park.district) && (!industry || industry === park.industry));
  const visibleMarkers = matchingMarkers.filter(park => park.name.includes(keyword.trim()));
  const inRange = matchingMarkers.filter(park => containsPoint(boundary, park));
  const visibleParks = visibleMarkers.filter(park => containsPoint(boundary, park));
  const pointsByPark = new Map(inRange.map(park => [park.name, park]));
  const visibleCompanies = companies.flatMap(company => {
    const park = pointsByPark.get(company.park) ?? inRange.find(point => company.park.includes(point.name));
    if (!park || !(company.name + company.park).includes(keyword.trim())) return [];
    return [{ company, park }];
  });
  return <div className="business-page business-map-page">
    <PageHeading title="商机地图" description={city + " · 产业载体与关联企业分布示意"} />
    <div className="business-map-layout">
      <PageSection title="圈选结果" description={visibleParks.length + " 个园区 · " + visibleCompanies.length + " 家演示企业"}>
        <div className="business-map-filters">
          <SearchField value={keyword} onChange={setKeyword} placeholder="搜索园区或企业" />
          <NativeSelect label="区域" value={district} onChange={setDistrict} options={[...new Set(markers.map(park => park.district))]} />
          <NativeSelect label="产业" value={industry} onChange={setIndustry} options={[...new Set(markers.map(park => park.industry))]} />
        </div>
        <SectionTabs value={tab} onChange={setTab} items={[
          { key: "parks", label: "园区", count: visibleParks.length },
          { key: "companies", label: "企业", count: visibleCompanies.length },
        ]} />
        <div className="map-result-list">
          {tab === "parks" && visibleParks.map(park => <button key={park.id} type="button" onClick={() => setSelected(park)} className={boundary ? "is-selected" : undefined}>
            <span className="map-marker-dot"><MapPin /></span><span><strong>{park.name}</strong><small>{park.district} · {park.industry} · {park.enterprises} 家在驻</small></span>
          </button>)}
          {tab === "companies" && visibleCompanies.map(({ company, park }) => <button key={company.id} type="button" onClick={() => setSelected(park)} className={boundary ? "is-selected" : undefined}>
            <span className="map-marker-dot"><Building2 /></span><span><strong>{company.name}</strong><small>{park.name} · {company.industry}</small></span>
          </button>)}
          {(tab === "parks" ? !visibleParks.length : !visibleCompanies.length) && <p className="business-empty-hint">当前范围暂无{tab === "parks" ? "园区" : "企业"}</p>}
        </div>
      </PageSection>
      <SpatialMap parks={tab === "parks" ? visibleMarkers : matchingMarkers} boundary={boundary} onBoundary={setBoundary} selected={selected?.id} onSelect={setSelected} />
    </div>
    <Sheet open={!!selected} onOpenChange={open => !open && setSelected(null)}>
      <SheetContent side="right" className="business-detail-sheet os-glass-card"><SheetHeader>
        <SheetTitle>{selected?.name}</SheetTitle><SheetDescription>{selected?.district} · {selected?.industry}</SheetDescription>
      </SheetHeader>
      {selected && <PageSection title="在驻企业" description={selected.enterprises + " 家"}><Button variant="outline" onClick={() => {
        setBoundary(null); setKeyword(selected.name); setTab("companies"); setSelected(null);
      }}>查看关联企业</Button><ActionButton action="新增" onClick={async () => {
        try {
          await api.create("clues", { company: selected.name, intent: "园区空间与招商需求跟进", region: selected.district, targetCity: city, industry: selected.industry, source: "商机地图", status: "待跟进", park: selected.name, score: 75, date: new Date().toISOString().slice(0, 10) });
          toast.success("已加入项目线索");
        } catch (cause) { toast.error(cause instanceof Error ? cause.message : "加入项目线索失败"); }
      }}>加入跟进</ActionButton></PageSection>}
      </SheetContent>
    </Sheet>
  </div>;
}
