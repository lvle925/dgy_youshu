import { useMemo, useState } from "react";
import { Building2, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { ActionButton } from "@/app/AccessContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { companies, mapMarkers } from "../../../src/data/mock.js";
import { api } from "../../../src/api.js";
import { PageHeading, PageSection, NativeSelect, SearchField, SectionTabs } from "@/pages/PagePrimitives";
import { containsPoint, SpatialMap, type Boundary, type GeoPosition, type ParkPoint } from "@/components/SpatialMap";
import { useCurrentCity } from "@/app/CityContext";
import { isShanghaiArea, regionMatches } from "@/lib/cityData";
import { parkPointsFromGeoJson, toParkFeatureCollection } from "@/lib/spatialData";
import { useBusinessCollection } from "@/lib/useBusinessCollection";

type CompanyMapRow = {
  id: string;
  name: string;
  industry: string;
  district: string;
  address: string;
  registerCapital: string;
  officePark: ParkPoint;
  officePosition: GeoPosition;
  registrationPosition: GeoPosition;
};
type SelectedCompany = CompanyMapRow & { selection: Boundary | null };

function nearestRegistrationPosition(company: typeof companies[number], officePark: ParkPoint, markers: ParkPoint[], index: number): GeoPosition {
  const districtPark = markers.find((park) => park.district === company.district);
  const anchor = districtPark?.position ?? officePark.position;
  const lngOffset = ((index % 3) - 1) * 0.006;
  const latOffset = (((index + 1) % 3) - 1) * 0.005;
  return [anchor[0] + lngOffset, anchor[1] + latOffset];
}

function CompanyResults({ rows, tab, mode, onTab, onMode }: {
  rows: SelectedCompany[];
  tab: "registration" | "office";
  mode: "all" | "potential";
  onTab: (value: "registration" | "office") => void;
  onMode: (value: "all" | "potential") => void;
}) {
  const registered = rows.filter((row) => containsPoint(row.selection, row.registrationPosition));
  const office = rows.filter((row) => containsPoint(row.selection, row.officePosition));
  const sourceRows = tab === "registration" ? registered : office;
  const filteredRows = mode === "potential"
    ? sourceRows.filter((row) => tab === "registration"
      ? !containsPoint(row.selection, row.officePosition)
      : !containsPoint(row.selection, row.registrationPosition))
    : sourceRows;

  return <div className="map-company-results">
    <div className="map-company-switchers">
      <SectionTabs value={tab} onChange={(value) => onTab(value as "registration" | "office")} items={[{ key: "registration", label: "注册企业", count: registered.length }, { key: "office", label: "办公企业", count: office.length }]} />
      <div className="map-company-mode" role="group" aria-label="企业关系筛选"><Button size="sm" variant={mode === "all" ? "default" : "outline"} onClick={() => onMode("all")}>全部</Button><Button size="sm" variant={mode === "potential" ? "default" : "outline"} onClick={() => onMode("potential")}>{tab === "registration" ? "潜在流失" : "潜在招引"}</Button></div>
    </div>
    <div className="map-company-summary"><strong>{filteredRows.length.toLocaleString()}</strong><span>家企业</span><small>{mode === "potential" ? (tab === "registration" ? "本地注册但异地办公" : "本地办公但异地注册") : (tab === "registration" ? "当前范围内注册登记" : "当前范围内办公经营")}</small></div>
    <div className="map-company-table-wrap"><Table><TableHeader><TableRow><TableHead>企业名称</TableHead><TableHead>所属行业</TableHead><TableHead>注册区域</TableHead><TableHead>办公载体</TableHead></TableRow></TableHeader><TableBody>{filteredRows.map((row) => <TableRow key={row.id}><TableCell><strong>{row.name}</strong><small>{row.address}</small></TableCell><TableCell>{row.industry}</TableCell><TableCell>{row.district}</TableCell><TableCell>{row.officePark.name}</TableCell></TableRow>)}</TableBody></Table>{!filteredRows.length && <p className="business-empty-hint">当前范围暂无匹配企业</p>}</div>
  </div>;
}

export function BusinessMapPage() {
  const { city } = useCurrentCity();
  return <CityMap key={city} city={city} />;
}

function CityMap({ city }: { city: string }) {
  const companyData = useBusinessCollection<Record<string, unknown> & { id: string; name: string }>({ key: "youshu-map-company-archives", seed: companies as Array<Record<string, unknown> & { id: string; name: string }>, apiCollection: "companyArchives" });
  const companySource = companyData.rows.length ? companyData.rows : companies;
  const [keyword, setKeyword] = useState("");
  const [addressKeyword, setAddressKeyword] = useState("");
  const [district, setDistrict] = useState("");
  const [industry, setIndustry] = useState("");
  const [tab, setTab] = useState("parks");
  const [boundary, setBoundary] = useState<Boundary | null>(null);
  const [selected, setSelected] = useState<ParkPoint | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [companyTab, setCompanyTab] = useState<"registration" | "office">("registration");
  const [companyMode, setCompanyMode] = useState<"all" | "potential">("all");
  const [focusPosition, setFocusPosition] = useState<GeoPosition | null>(null);
  const [focusKey, setFocusKey] = useState(0);
  const markers = isShanghaiArea(city) ? mapMarkers.filter((marker) => city === "上海市" || regionMatches(marker.district, city)) : [];
  const allCityMarkers = isShanghaiArea(city) ? parkPointsFromGeoJson(toParkFeatureCollection(mapMarkers.filter((marker) => city === "上海市" || regionMatches(marker.district, city)))) : [];
  const matchingFeatures = toParkFeatureCollection(markers.filter((park) => (!district || district === park.district) && (!industry || industry === park.industry)));
  const matchingMarkers = parkPointsFromGeoJson(matchingFeatures);
  const visibleMarkers = matchingMarkers.filter((park) => park.name.includes(keyword.trim()));
  const inRange = matchingMarkers.filter((park) => containsPoint(boundary, park.position));
  const visibleParks = visibleMarkers.filter((park) => containsPoint(boundary, park.position));
  const pointsByPark = new Map(inRange.map((park) => [park.name, park]));
  const companyRows = useMemo<CompanyMapRow[]>(() => (companySource as typeof companies[number][]).flatMap((company, index) => {
    const companyRecord = company as typeof company & Record<string, unknown>;
    const officePark = allCityMarkers.find((park) => String(company.park ?? "").includes(park.name)) ?? allCityMarkers[index % Math.max(allCityMarkers.length, 1)];
    if (!officePark) return [];
    const officeCoordinates = [companyRecord.officeLng ?? companyRecord.lng, companyRecord.officeLat ?? companyRecord.lat].map(Number);
    const registrationCoordinates = [companyRecord.registerLng ?? companyRecord.registrationLng, companyRecord.registerLat ?? companyRecord.registrationLat].map(Number);
    const hasOfficeCoordinates = officeCoordinates.every(Number.isFinite) && officeCoordinates.some((coordinate) => coordinate !== 0);
    const hasRegistrationCoordinates = registrationCoordinates.every(Number.isFinite) && registrationCoordinates.some((coordinate) => coordinate !== 0);
    return [{
      id: String(company.id), name: String(company.name), industry: String(company.industry ?? "未分类"), district: String(company.district ?? "未知区域"), address: String(company.address ?? ""),
      registerCapital: String(company.regCapital ?? companyRecord.registerCapital ?? ""), officePark,
      officePosition: hasOfficeCoordinates ? [officeCoordinates[0], officeCoordinates[1]] : officePark.position,
      registrationPosition: hasRegistrationCoordinates ? [registrationCoordinates[0], registrationCoordinates[1]] : nearestRegistrationPosition(company, officePark, allCityMarkers, index),
    }];
  }), [companySource, allCityMarkers]);
  const visibleCompanies = companyRows.filter((row) => (!keyword.trim() || (row.name + row.officePark.name + row.address).includes(keyword.trim())) && pointsByPark.has(row.officePark.name));
  const selectedRows = companyRows.filter((row) => containsPoint(boundary, row.officePosition) || containsPoint(boundary, row.registrationPosition));
  const companyCount = selectedRows.length;

  function locateAddress() {
    const query = addressKeyword.trim();
    if (!query) return;
    const marker = markers.find((item) => (item.name + item.district + item.industry).includes(query));
    const company = (companySource as typeof companies[number][]).find((item) => (String(item.name ?? "") + String(item.address ?? "") + String(item.park ?? "") + String(item.district ?? "")).includes(query));
    const companyPark = company ? markers.find((item) => String(company.park ?? "").includes(item.name)) : undefined;
    const companyDistrict = company ? markers.find((item) => String(company.district ?? "").includes(item.district)) : undefined;
    const target = marker ?? companyPark ?? companyDistrict ?? (company ? markers[0] : undefined);
    if (!target) { toast.error("未找到匹配的园区、企业或地址"); return; }
    const companyRecord = company as (typeof company & Record<string, unknown>) | undefined;
    const coordinates = companyRecord && !marker ? [companyRecord.officeLng ?? companyRecord.lng, companyRecord.officeLat ?? companyRecord.lat].map(Number) : [];
    const hasCompanyCoordinates = coordinates.length === 2 && coordinates.every(Number.isFinite) && coordinates.some((coordinate) => coordinate !== 0);
    setFocusPosition(hasCompanyCoordinates ? [coordinates[0], coordinates[1]] : [target.lng, target.lat]);
    setFocusKey((value) => value + 1);
    setSelected(allCityMarkers.find((park) => park.id === target.id) ?? null);
    setKeyword("");
    toast.success("地图已定位到 " + target.name);
  }

  function handleBoundary(next: Boundary | null) { setBoundary(next); if (!next) setResultsOpen(false); }

  return <div className="business-page business-map-page">
    <PageHeading title="商机地图" description={city + " · 产业载体、注册企业与办公企业空间分析"} />
    <div className="business-map-layout">
      <PageSection title="地图范围" description={boundary ? `已圈选 ${companyCount} 家企业，可在右侧查看企业关系` : visibleParks.length + " 个园区 · " + visibleCompanies.length + " 家演示企业"}>
        <div className="business-map-filters"><div className="business-map-search-line"><SearchField value={addressKeyword} onChange={setAddressKeyword} placeholder="搜索地址、园区或企业" /><Button type="button" size="sm" onClick={locateAddress}><Search data-icon="inline-start" />定位</Button></div><SearchField value={keyword} onChange={setKeyword} placeholder="筛选当前地图结果" /><NativeSelect label="区域" value={district} onChange={setDistrict} options={[...new Set(markers.map((park) => park.district))]} /><NativeSelect label="产业" value={industry} onChange={setIndustry} options={[...new Set(markers.map((park) => park.industry))]} /></div>
        <SectionTabs value={tab} onChange={setTab} items={[{ key: "parks", label: "园区", count: visibleParks.length }, { key: "companies", label: "企业", count: visibleCompanies.length }]} />
        <div className="map-result-list">{tab === "parks" && visibleParks.map((park) => <button key={park.id} type="button" onClick={() => setSelected(park)} className={boundary ? "is-selected" : undefined}><span className="map-marker-dot"><MapPin /></span><span><strong>{park.name}</strong><small>{park.district} · {park.industry} · {park.enterprises} 家在驻</small></span></button>)}{tab === "companies" && visibleCompanies.map((row) => <button key={row.id} type="button" onClick={() => setSelected(row.officePark)}><span className="map-marker-dot"><Building2 /></span><span><strong>{row.name}</strong><small>{row.officePark.name} · {row.industry}</small></span></button>)}{(tab === "parks" ? !visibleParks.length : !visibleCompanies.length) && <p className="business-empty-hint">当前范围暂无{tab === "parks" ? "园区" : "企业"}</p>}</div>
      </PageSection>
      <SpatialMap parks={tab === "parks" ? visibleMarkers : matchingMarkers} boundary={boundary} onBoundary={handleBoundary} onBoundaryComplete={() => setResultsOpen(true)} selected={selected?.id} onSelect={setSelected} focusPosition={focusPosition} focusKey={focusKey} />
    </div>
    <Sheet open={resultsOpen} onOpenChange={setResultsOpen}><SheetContent side="right" className="business-detail-sheet map-company-sheet"><SheetHeader><SheetTitle>圈选范围企业</SheetTitle><SheetDescription>基于 GeoJSON 边界实时筛选注册企业与办公企业，支持潜在招引、潜在流失分析</SheetDescription></SheetHeader><div className="map-company-panel-body"><div className="map-company-kpis"><div><strong>{companyCount.toLocaleString()}</strong><span>范围内企业</span></div><div><strong>{selectedRows.filter((row) => containsPoint(boundary, row.registrationPosition)).length.toLocaleString()}</strong><span>注册企业</span></div><div><strong>{selectedRows.filter((row) => containsPoint(boundary, row.officePosition)).length.toLocaleString()}</strong><span>办公企业</span></div></div><CompanyResults rows={selectedRows.map((row) => ({ ...row, selection: boundary }))} tab={companyTab} mode={companyMode} onTab={(value) => { setCompanyTab(value); setCompanyMode("all"); }} onMode={setCompanyMode} /><div className="map-company-sheet-actions"><ActionButton action="新增" onClick={async () => { try { await api.create("clues", { company: "圈选范围企业", intent: companyTab === "office" ? "潜在招引企业跟进" : "潜在流失企业稳商", region: city, source: "商机地图圈选", status: "待跟进", date: new Date().toISOString().slice(0, 10) }); toast.success("已加入项目线索"); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "加入项目线索失败"); } }}>纳入招商台账</ActionButton></div></div></SheetContent></Sheet>
    <Sheet open={!!selected && !resultsOpen} onOpenChange={(open) => !open && setSelected(null)}><SheetContent side="right" className="business-detail-sheet"><SheetHeader><SheetTitle>{selected?.name}</SheetTitle><SheetDescription>{selected?.district} · {selected?.industry}</SheetDescription></SheetHeader>{selected && <PageSection title="在驻企业" description={selected.enterprises + " 家"}><Button variant="outline" onClick={() => { setBoundary(null); setKeyword(selected.name); setTab("companies"); setSelected(null); }}>查看关联企业</Button><ActionButton action="新增" onClick={async () => { try { await api.create("clues", { company: selected.name, intent: "园区空间与招商需求跟进", region: selected.district, targetCity: city, industry: selected.industry, source: "商机地图", status: "待跟进", park: selected.name, score: 75, date: new Date().toISOString().slice(0, 10) }); toast.success("已加入项目线索"); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "加入项目线索失败"); } }}>加入跟进</ActionButton></PageSection>}</SheetContent></Sheet>
  </div>;
}
