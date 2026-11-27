import { ActionButton } from "@/app/AccessContext";
import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, InlineProgress, TagPills, type DataColumn } from "@/../src/components/shared/DataTable";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { StatBar } from "@/../src/components/shared/StatBar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { districts, parks } from "../../../src/data/mock.js";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { FormDialog, FormField, NativeSelect, PageHeading, PageSection, SearchField, StatusValue } from "@/pages/PagePrimitives";

type Row = Record<string, any> & { id: string | number };

export function ParksBuildingsPage() {
  const data = useBusinessCollection<Row>({ key: "youshu-parks-buildings", seed: parks, apiCollection: "parksBuildings" });
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [district, setDistrict] = useState("");
  const [type, setType] = useState("");
  const [view, setView] = useState<"card" | "table">("card");
  const [detail, setDetail] = useState<Row | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", district: "浦东新区", type: "特色产业园", address: "", area: "", buildings: "", enterprises: "", occupancy: "" });
  const filtered = useMemo(() => data.rows.filter((row) => (!keyword || String(row.name).includes(keyword)) && (!district || row.district === district) && (!type || row.type === type)), [data.rows, keyword, district, type]);
  async function addPark(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!form.name.trim()) return toast.warning("请填写载体名称"); try { await data.createRecord({ ...form, buildings: Number(form.buildings) || 0, enterprises: Number(form.enterprises) || 0, occupancy: Number(form.occupancy) || 0 } as Omit<Row, "id">); setAddOpen(false); setForm({ ...form, name: "", address: "", area: "", buildings: "", enterprises: "", occupancy: "" }); toast.success("园区载体已保存"); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "保存失败"); } }
  const columns: DataColumn<Row>[] = [
    { key: "name", header: "载体名称", sortable: true, primary: true, subtext: (row) => `${row.district || "—"} · ${row.address || "地址待补充"}` },
    { key: "type", header: "载体类型", cell: (row) => <TagPills tags={[row.type, row.area].filter(Boolean)} max={2} /> },
    { key: "buildings", header: "楼宇数", sortable: true },
    { key: "area", header: "建筑面积" },
    { key: "enterprises", header: "入驻企业", sortable: true },
    { key: "occupancy", header: "入驻率", sortable: true, cell: (row) => <InlineProgress value={Number(row.occupancy ?? 0)} label={`${row.occupancy ?? 0}%`} /> },
    { key: "manager", header: "运营负责人" },
  ];
  return <div className="business-page"><PageHeading title="园区楼宇" description="检索招商载体与园区楼宇，查看空间规模和入驻情况" source={data.source} actions={<ActionButton action="新增" onClick={() => setAddOpen(true)}><Plus data-icon="inline-start" />新增园区载体</ActionButton>} /><StatBar scope="当前筛选" items={[{ label: "园区载体", value: filtered.length, suffix: "处" }, { label: "楼宇总数", value: filtered.reduce((sum, row) => sum + Number(row.buildings || 0), 0), suffix: "栋" }, { label: "入驻企业", value: filtered.reduce((sum, row) => sum + Number(row.enterprises || 0), 0).toLocaleString(), suffix: "家" }, { label: "平均入驻率", value: filtered.length ? (filtered.reduce((sum, row) => sum + Number(row.occupancy || 0), 0) / filtered.length).toFixed(1) : "0.0", suffix: "%", tone: "success" }]} /><PageSection title="载体清单" description="按区域、类型与关键词查找可招商空间"><div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} /><NativeSelect label="所在区域" value={district} onChange={setDistrict} options={districts} /><NativeSelect label="载体类型" value={type} onChange={setType} options={["特色产业园", "综合园区", "产业基地", "开发区"]} /><div className="business-view-switch"><Button size="sm" variant={view === "card" ? "default" : "outline"} onClick={() => setView("card")}>卡片</Button><Button size="sm" variant={view === "table" ? "default" : "outline"} onClick={() => setView("table")}>列表</Button></div></div>{view === "table" ? <DataTable columns={columns} data={filtered} openRowDetails={false} onRowClick={setDetail} detailTitle="载体详情" /> : <div className="park-card-grid">{filtered.map((park) => <button key={park.id} type="button" className="park-card" onClick={() => setDetail(park)}><div className="park-card-top"><span className="park-card-icon"><Building2 /></span><StatusValue value={park.type} /></div><strong>{park.name}</strong><span className="park-card-address">{park.district} · {park.address}</span><div className="park-card-metrics"><span><b>{park.buildings}</b>栋楼宇</span><span><b>{park.enterprises}</b>家企业</span><span><b>{park.occupancy}%</b>入驻率</span></div><div className="park-occupancy"><i style={{ width: `${Math.min(100, Number(park.occupancy))}%` }} /></div></button>)}</div>}{!filtered.length && <div className="business-empty-hint"><Building2 /><strong>没有匹配的园区载体</strong><span>可重置区域、类型与关键词后重新查找。</span><Button variant="outline" onClick={() => { setKeyword(""); setDistrict(""); setType(""); }}>重置筛选</Button></div>}</PageSection>
    <FormDialog open={addOpen} onOpenChange={setAddOpen} title="新增园区载体" onSubmit={addPark}><FormField label="载体名称" required><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></FormField><FormField label="所在区域"><NativeSelect bare label="所在区域" allowEmpty={false} value={form.district} onChange={(value) => setForm({ ...form, district: value })} options={districts} /></FormField><FormField label="载体类型"><NativeSelect bare label="载体类型" allowEmpty={false} value={form.type} onChange={(value) => setForm({ ...form, type: value })} options={["特色产业园", "综合园区", "产业基地", "开发区"]} /></FormField><FormField label="地址"><Input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></FormField><FormField label="建筑面积"><Input value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })} placeholder="例如 12.6 万㎡" /></FormField><FormField label="楼宇数量"><Input type="number" min="0" value={form.buildings} onChange={(event) => setForm({ ...form, buildings: event.target.value })} /></FormField><FormField label="入驻企业"><Input type="number" min="0" value={form.enterprises} onChange={(event) => setForm({ ...form, enterprises: event.target.value })} /></FormField><FormField label="入驻率 %"><Input type="number" min="0" max="100" value={form.occupancy} onChange={(event) => setForm({ ...form, occupancy: event.target.value })} /></FormField></FormDialog>
    <Sheet open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}><SheetContent side="right" className="business-detail-sheet"><SheetHeader><SheetTitle>{detail?.name}</SheetTitle><SheetDescription>{detail?.district} · {detail?.type}</SheetDescription></SheetHeader>{detail && <><p className="business-detail-intro">{detail.intro || "园区载体信息"}</p><div className="business-metric-grid compact"><MetricCard title="建筑面积" value={detail.area || "待补充"} /><MetricCard title="楼宇数量" value={detail.buildings ?? "—"} /><MetricCard title="入驻企业" value={detail.enterprises ?? "—"} /><MetricCard title="入驻率" value={`${detail.occupancy ?? 0}%`} /></div><p className="business-muted">{detail.address} · 运营负责人 {detail.manager || "待分配"}</p><Button variant="outline" onClick={() => { const id = detail.id; setDetail(null); navigate(`/park/detail/${id}`); }}>查看园区详情</Button></>}</SheetContent></Sheet>
  </div>;
}
