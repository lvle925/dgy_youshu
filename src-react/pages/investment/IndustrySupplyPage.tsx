import { ActionButton } from "@/app/AccessContext";
import { useMemo, useState, type FormEvent } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type DataColumn } from "@/../src/components/shared/DataTable";
import { StatBar } from "@/../src/components/shared/StatBar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { industriesShort, supplyChainNodes } from "../../../src/data/mock.js";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { FormDialog, FormField, NativeSelect, PageHeading, PageSection, SearchField, StatusValue } from "@/pages/PagePrimitives";

type Row = Record<string, any> & { id: string | number };

export function IndustrySupplyPage() {
  const data = useBusinessCollection<Row>({ key: "youshu-supply-chain", seed: supplyChainNodes, apiCollection: "supplyRelations" });
  const [keyword, setKeyword] = useState("");
  const [chain, setChain] = useState("");
  const [role, setRole] = useState("");
  const [detail, setDetail] = useState<Row | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", industry: "生物医药", level: "配套企业", products: "", park: String(supplyChainNodes[0]?.park ?? "") });
  const filtered = useMemo(() => data.rows.filter((row) => (!keyword || `${row.name} ${row.products}`.includes(keyword)) && (!chain || row.industry === chain) && (!role || row.level === role)), [data.rows, keyword, chain, role]);
  const columns: DataColumn<Row>[] = [
    { key: "name", header: "企业名称", sortable: true, cell: (row) => <button className="business-link" onClick={() => setDetail(row)}>{row.name}</button> }, { key: "industry", header: "所属产业链" }, { key: "level", header: "供应链角色", cell: (row) => <StatusValue value={row.level} /> }, { key: "products", header: "主营产品" }, { key: "partners", header: "合作伙伴", sortable: true }, { key: "park", header: "所属园区" },
  ];
  async function addCompany(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!form.name.trim()) return toast.warning("请填写企业名称"); try { await data.createRecord(form as Omit<Row, "id">); setAddOpen(false); setForm({ ...form, name: "", products: "" }); toast.success("供应链企业已新增"); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "新增失败"); } }
  return <div className="business-page"><PageHeading title="供应链" description="检索链主、核心供应商与配套企业，查看上下游协同关系" source={data.source} actions={<ActionButton action="新增" onClick={() => setAddOpen(true)}><Plus data-icon="inline-start" />新增企业</ActionButton>} /><StatBar scope="全库总量" items={[{ label: "供应链企业", value: data.rows.length, suffix: "家" }, { label: "链主企业", value: data.rows.filter((row) => row.level === "链主企业").length, suffix: "家" }, { label: "核心供应商", value: data.rows.filter((row) => row.level === "核心供应商").length, suffix: "家" }, { label: "本地配套率", value: "68.5", suffix: "%", tone: "success" }, { label: "供需对接成功", value: "342", suffix: "次", tone: "gold" }]} /><PageSection title="供应链企业列表" description={`共 ${filtered.length} 家企业`}><div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="搜索企业名称 / 产品" /><NativeSelect label="所属产业链" value={chain} onChange={setChain} options={[...new Set(data.rows.map((row) => row.industry))]} /><NativeSelect label="企业类型" value={role} onChange={setRole} options={["链主企业", "核心供应商", "配套企业"]} /></div><DataTable columns={columns} data={filtered} openRowDetails={false} onRowClick={setDetail} detailTitle="供应链企业" /></PageSection>
    <FormDialog open={addOpen} onOpenChange={setAddOpen} title="新增供应链企业" onSubmit={addCompany}><FormField label="企业名称" required><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></FormField><FormField label="所属产业链"><select className="business-input" value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })}>{industriesShort.map((item) => <option key={item}>{item}</option>)}</select></FormField><FormField label="企业类型"><select className="business-input" value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}>{["链主企业", "核心供应商", "配套企业"].map((item) => <option key={item}>{item}</option>)}</select></FormField><FormField label="主营产品"><Input value={form.products} onChange={(event) => setForm({ ...form, products: event.target.value })} /></FormField></FormDialog>
    <Sheet open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}><SheetContent side="right" className="business-detail-sheet"><SheetHeader><SheetTitle>{detail?.name}</SheetTitle><SheetDescription>供应链上下游关系</SheetDescription></SheetHeader>{detail && <><div className="business-chip-row"><StatusValue value={detail.level} /><StatusValue value={detail.industry} /><span className="business-muted">{detail.park}</span></div><div className="supply-flow"><div><small>上游供应</small><span>原材料供应商</span><span>技术服务伙伴</span><span>设备合作企业</span></div><ArrowRight /><div><small>当前企业</small><strong>{detail.name}</strong><p>{detail.products}</p></div><ArrowRight /><div><small>下游需求</small><span>产业链客户</span><span>应用场景伙伴</span><span>联合研发单位</span></div></div><p className="business-muted">登记合作伙伴 {detail.partners ?? 0} 家，可继续维护上下游企业关系。</p></>}</SheetContent></Sheet>
  </div>;
}
