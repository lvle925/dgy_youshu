import { api } from "../../../src/api.js";
import { useState } from "react";
import { Plus, Target } from "lucide-react";
import { toast } from "sonner";
import { ActionButton } from "@/app/AccessContext";
import { useCurrentCity } from "@/app/CityContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { DataTable } from "@/../src/components/shared/DataTable";
import { ChipFilter, type ChipFilterValue } from "@/../src/components/shared/ChipFilter";
import { StatBar } from "@/../src/components/shared/StatBar";
import { FormDialog, FormField, NativeSelect, PageHeading, PageSection, SearchField, SectionTabs, StatusValue } from "@/pages/PagePrimitives";

type MatchCompany = { id: string; name: string; industry: string; city: string; capital: string; park?: string; tags: string[]; score: number; contact?: string; contacted?: boolean };
type Model = { id: string; city: string; name: string; rules: string[]; minimum: number; updated: string };
const companySeed: MatchCompany[] = [];
const modelSeed: Model[] = [];
const rules = ["项目线索", "业务布局", "对外投资", "成本敏感", "指标敏感", "注册地址变更", "租期敏感", "股东变更", "融资成功", "链主供应商", "项目考察"];

function capital(row: MatchCompany) {
  return Number.parseFloat(row.capital.replace(/,/g, "")) * (row.capital.includes("亿元") ? 10_000 : 1) || 0;
}

export function BusinessHallPage() {
  const { city } = useCurrentCity();
  return <CityHall key={city} city={city} />;
}

function CityHall({ city }: { city: string }) {
  const companies = useBusinessCollection({ key: "youshu-match-companies", seed: companySeed, apiCollection: "matchCompanies" });
  const models = useBusinessCollection({ key: "youshu-opportunity-models", seed: modelSeed, apiCollection: "opportunityModels" });
  const localModels = models.rows.filter(row => row.city === city);
  const [modelId, setModelId] = useState("");
  const model = localModels.find(row => row.id === modelId) ?? localModels[0];
  const [tab, setTab] = useState("matches");
  const [keyword, setKeyword] = useState("");
  const [industry, setIndustry] = useState("");
  const [filters, setFilters] = useState<ChipFilterValue>({});
  const [mode, setMode] = useState<"new" | "edit" | null>(null);
  const [name, setName] = useState("");
  const [minimum, setMinimum] = useState(0);
  const [draftRules, setDraftRules] = useState<ChipFilterValue>({});
  const [saving, setSaving] = useState(false);
  const cityCompanies = companies.rows.filter(row => row.city === city);
  const matching = cityCompanies.filter(row => (!industry || industry === row.industry) && row.name.includes(keyword.trim()) &&
    capital(row) >= (model?.minimum ?? 0) && (!model?.rules.length || model.rules.some(rule => row.tags.includes(rule))) &&
    (!filters.rules?.length || filters.rules.some(rule => row.tags.includes(rule))));
  const groups = [{ key: "rules", label: "商机信号", options: rules }];

  function edit(editing: boolean) {
    setName(editing && model ? model.name : city + "产业精准招商模型");
    setMinimum(editing && model ? model.minimum : 0);
    setDraftRules({ rules: editing ? model?.rules ?? [] : [] });
    setMode(editing ? "edit" : "new");
  }

  async function addLead(row: MatchCompany) {
    try {
      await api.create("clues", { company: row.name, intent: "招商模型匹配企业", region: city, targetCity: city, industry: row.industry,
        source: "商机大厅", status: "待跟进", park: row.park, score: row.score, contact: row.contact,
        date: new Date().toISOString().slice(0, 10), desc: "由商机模型匹配进入线索池" });
      toast.success("已加入项目线索");
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "加入线索失败"); }
  }

  async function markContact(row: MatchCompany) {
    try {
      await companies.updateRecord(row.id, { contacted: !row.contacted });
      toast.success(row.contacted ? "已取消联系标记" : "已标记为已联系");
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "联系标记更新失败"); }
  }

  return <div className="business-page">
    <PageHeading title="商机大厅" description={city + " · 按招商模型筛选企业并维护联系记录"} source={companies.source}
      actions={<ActionButton action="新增" onClick={() => edit(false)}><Plus data-icon="inline-start" />新建模型</ActionButton>} />
    <PageSection title="招商模型">
      <div className="model-summary">
        <div><span className="model-summary-icon"><Target /></span><div>
          <strong>{model?.name ?? city + "产业精准招商模型"}</strong>
          <p>{city} · 已收录 {cityCompanies.length} 家企业{model && " · 更新于 " + model.updated}</p>
        </div></div>
        <div className="business-toolbar">
          {!!localModels.length && <label className="business-native-select"><span>选择模型</span><select value={model?.id ?? ""} onChange={event => setModelId(event.target.value)}>{localModels.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
          {model && <ActionButton action="编辑" variant="outline" onClick={() => edit(true)}>编辑模型</ActionButton>}
        </div>
      </div>
      <SectionTabs value={tab} onChange={setTab} items={[
        { key: "matches", label: "匹配企业", count: matching.length },
        { key: "analysis", label: "企业分析" }, { key: "rules", label: "模型规则", count: model?.rules.length ?? 0 },
      ]} />
      {tab === "matches" && <>
        <ChipFilter groups={groups} value={filters} onChange={setFilters} />
        <div className="business-toolbar">
          <SearchField value={keyword} onChange={setKeyword} placeholder="搜索匹配企业" />
          <NativeSelect label="所属行业" value={industry} onChange={setIndustry} options={[...new Set(cityCompanies.map(row => row.industry))]} />
        </div>
        <DataTable data={matching} detailTitle="匹配企业" defaultSort={{ key: "score", direction: "desc" }} columns={[
          { key: "name", header: "企业名称", sortable: true }, { key: "industry", header: "所属行业" },
          { key: "capital", header: "注册资本", sortable: true, accessor: capital },
          { key: "tags", header: "命中规则", cell: row => row.tags.join("、") },
          { key: "score", header: "匹配度", sortable: true, cell: row => row.score + " 分" },
          { key: "contacted", header: "联系状态", cell: row => <StatusValue value={row.contacted ? "已联系" : "待联系"} /> },
          { key: "action", header: "操作", cell: row => <ActionButton action="编辑" variant="outline" size="sm" onClick={() => void markContact(row)}>{row.contacted ? "取消标记" : "标记已联系"}</ActionButton> },
        ]} renderDetails={row => <div className="business-detail-prose"><h3>{row.name}</h3><p>{row.city} · {row.industry}</p><p>联系人 {row.contact || "待补充"}</p><StatusValue value={row.contacted ? "已联系" : "待联系"} /><div className="business-toolbar"><ActionButton action="新增" onClick={() => void addLead(row)}>加入项目线索</ActionButton></div></div>} />
      </>}
      {tab === "analysis" && <StatBar scope="当前筛选结果" items={[
        { label: "匹配企业", value: matching.length },
        { label: "已联系", value: matching.filter(row => row.contacted).length },
        { label: "行业数", value: new Set(matching.map(row => row.industry)).size },
        { label: "高匹配度", value: matching.filter(row => row.score >= 85).length },
        { label: "平均匹配度", value: matching.length ? (matching.reduce((sum, row) => sum + row.score, 0) / matching.length).toFixed(1) : "—" },
      ]} />}
      {tab === "rules" && <div className="business-detail-prose"><h3>模型筛选规则</h3><p>最低注册资本 {model?.minimum ?? 0} 万元</p><p>{model?.rules.length ? model.rules.join("、") : "当前包含所有商机信号"}</p></div>}
      {(companies.error || models.error) && <p role="status">{companies.error || models.error}</p>}
    </PageSection>
    <FormDialog open={!!mode} onOpenChange={open => !open && setMode(null)} title={mode === "edit" ? "编辑模型" : "新建模型"} busy={saving} onSubmit={async event => {
      event.preventDefault();
      if (!name.trim() || saving) return;
      const payload = { city, name: name.trim(), minimum, rules: draftRules.rules ?? [], updated: new Date().toLocaleDateString("sv-SE") };
      setSaving(true);
      try {
        const saved = mode === "edit" && model ? await models.updateRecord(model.id, payload) : await models.createRecord(payload);
        setModelId(saved.id); setMode(null); toast.success("招商模型已保存");
      } catch (cause) { toast.error(cause instanceof Error ? cause.message : "保存失败"); }
      finally { setSaving(false); }
    }}>
      <FormField label="模型名称" required><Input value={name} onChange={event => setName(event.target.value)} required /></FormField>
      <FormField label="最低注册资本（万元）"><Input type="number" min={0} value={minimum} onChange={event => setMinimum(Number(event.target.value))} /></FormField>
      <div className="col-span-full"><ChipFilter groups={groups} value={draftRules} onChange={setDraftRules} /></div>
    </FormDialog>
  </div>;
}
