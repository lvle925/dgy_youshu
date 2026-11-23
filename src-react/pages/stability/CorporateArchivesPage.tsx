import { useReportExport } from "@/app/ReportQueue";
import { ActionButton } from "@/app/AccessContext";
import { useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { Download, Filter, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable, type DataColumn } from "@/../src/components/shared/DataTable";
import { FilterDrawer } from "@/../src/components/shared/FilterDrawer";
import { StatBar } from "@/../src/components/shared/StatBar";
import { StatusTag } from "@/../src/components/shared/StatusTag";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { archiveStats, companies, districts, platformUsers, visitOrders } from "../../../src/data/mock.js";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { PageHeading, PageSection, SearchField, StatusValue } from "@/pages/PagePrimitives";

type Row = Record<string, any> & { id: string | number };

export function CorporateArchivesPage() {
  const enqueue = useReportExport();
  const location = useLocation();
  const visitOrderData = useBusinessCollection<Row>({ key: "youshu-visit-orders", seed: visitOrders, apiCollection: "visitOrders" });
  const seed: Row[] = (companies as Row[]).map((row, index) => ({ ...row, archiveStatus: index === 9 ? "已迁出" : index === 19 ? "已消失" : "正常经营", registerCapital: row.regCapital, businessChange: ["无提示", "已更名", "未匹配"][index % 3], recruitment: ["增长", "稳定", "下降"][index % 3], patents: [0, 3, 12, 24, 38][index % 5] }));
  const data = useBusinessCollection<Row>({ key: "youshu-company-archives", seed });
  const requestedPark = (location.state as { park?: string } | null)?.park;
  const matchingPark = requestedPark
    ? String(seed.find((row) => String(row.park).includes(requestedPark))?.park ?? requestedPark)
    : "";
  const initialDrawerValue: Record<string, string[]> = matchingPark ? { park: [matchingPark] } : {};
  const [drawerValue, setDrawerValue] = useState(initialDrawerValue);
  const [keyword, setKeyword] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const groups = [
    { key: "district", label: "注册区域", options: districts },
    { key: "park", label: "所属园区", options: [...new Set(data.rows.map((row) => row.park))] },
    { key: "industry", label: "所属行业", options: [...new Set(data.rows.map((row) => row.industry))] },
    { key: "scale", label: "企业规模", options: ["微型", "小型", "中型", "大型", "超大型"] },
    { key: "archiveStatus", label: "经营状态", options: ["正常经营", "已迁出", "已消失"] },
    { key: "businessChange", label: "工商变更", options: ["无提示", "已注销", "已吊销", "已迁出", "未匹配", "已更名"] },
    { key: "recruitment", label: "招聘趋势", options: ["增长", "稳定", "下降"] },
    { key: "patents", label: "知识产权", options: ["0", "1-5", "6-20", "20+"] },
    { key: "socialSecurity", label: "社保人数", options: ["1-10", "11-50", "51-200", "200+"] },
    { key: "registerDate", label: "注册年限", options: ["1 年内", "1-3 年", "3-5 年", "5 年以上"] },
  ];
  const archiveConditions = drawerValue;
  const filtered = data.rows.filter((row) => (!keyword || `${row.name} ${row.code}`.includes(keyword)) && groups.every((group) => !archiveConditions[group.key]?.length || archiveConditions[group.key].some((item) => {
    const raw = String(row[group.key] ?? "");
    if (group.key === "patents") return item === "0" ? Number(raw) === 0 : item === "1-5" ? Number(raw) >= 1 && Number(raw) <= 5 : item === "6-20" ? Number(raw) >= 6 && Number(raw) <= 20 : Number(raw) > 20;
    if (group.key === "socialSecurity") { const count = Number(raw); return item === "1-10" ? count <= 10 : item === "11-50" ? count > 10 && count <= 50 : item === "51-200" ? count > 50 && count <= 200 : count > 200; }
    if (group.key === "registerDate") {
      const years = new Date().getFullYear() - Number(raw.slice(0, 4));
      return item === "1 年内" ? years <= 1 : item === "1-3 年" ? years > 1 && years <= 3 : item === "3-5 年" ? years > 3 && years <= 5 : years > 5;
    }
    return raw.includes(item);
  })));
  const columns: DataColumn<Row>[] = [{ key: "name", header: "企业名称", sortable: true }, { key: "park", header: "所属园区" }, { key: "industry", header: "行业" }, { key: "scale", header: "规模" }, { key: "socialSecurity", header: "社保人数", sortable: true }, { key: "settleDate", header: "入驻日期", sortable: true }, { key: "tags", header: "企业标签", cell: (row) => (row.tags ?? []).join("、") }, { key: "archiveStatus", header: "经营状态", cell: (row) => <StatusValue value={row.archiveStatus} /> }];
  async function importCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = document.querySelector<HTMLInputElement>("#archive-csv");
    const file = input?.files?.[0];
    if (!file) return toast.warning("请选择 CSV 文件");
    const lines = (await file.text()).split(/\r?\n/).filter(Boolean);
    const headers = (lines.shift() ?? "").split(",").map((value) => value.trim());
    const records = lines.map((line) => {
      const values = line.split(",").map((value) => value.trim());
      return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    }).filter((row) => row.name || row.company);
    if (!records.length) return toast.warning("CSV 中没有可导入的企业记录");
    for (const row of records) {
      await data.createRecord({ ...row, name: row.name || row.company, archiveStatus: row.archiveStatus || "正常经营", tags: row.tags ? String(row.tags).split("|") : [] } as Omit<Row, "id">);
    }
    setImportOpen(false);
    toast.success(`已导入 ${records.length} 家企业到本地档案`);
  }
  async function requestServiceFollowUp(row: Row) {
    const planDate = new Date();
    planDate.setDate(planDate.getDate() + 7);
    try {
      await visitOrderData.createRecord({
        title: `企业服务跟进 · ${row.name}`,
        company: row.name,
        source: "企业档案",
        owner: String(platformUsers[0]),
        planDate: planDate.toISOString().slice(0, 10),
        priority: row.archiveStatus === "已迁出" ? "高" : "中",
        note: `园区：${row.park}。请核实经营状态、企业诉求及可提供的服务。`,
        status: "待走访",
        creator: localStorage.getItem("DEMO_USER") || "本地管理员",
        created: new Date().toISOString().slice(0, 10),
      });
      toast.success(`已为 ${row.name} 创建服务跟进工单`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "创建服务跟进失败");
    }
  }
  return <div className="business-page"><PageHeading title="企业档案" description="从工商、招聘、经营和知识产权等维度查看园区企业画像" source={data.source} actions={<><ActionButton action="新增" variant="outline" onClick={() => setImportOpen(true)}><Upload data-icon="inline-start" />批量导入</ActionButton><ActionButton action="导出" variant="outline" onClick={() => enqueue("企业档案.csv", [{ header: "企业名称", value: row => row.name }, { header: "行业", value: row => row.industry }, { header: "区域", value: row => row.district }, { header: "园区", value: row => row.park }], filtered)}><Download data-icon="inline-start" />导出</ActionButton></>} /><StatBar scope="全库口径" items={[{ label: "入驻企业总数", value: archiveStats.settled.toLocaleString(), suffix: "家" }, { label: "累计迁出", value: archiveStats.migrated, suffix: "家", tone: "gold" }, { label: "企业消失", value: archiveStats.vanished, suffix: "家" }, { label: "平均入驻年限", value: archiveStats.avgYears, suffix: "年" }, { label: "企业留存率", value: archiveStats.retention, tone: "success" }]} /><PageSection title="企业档案" description={`当前筛选 ${filtered.length} 家企业`}><div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="企业名称或统一社会信用代码" /><Button variant="outline" onClick={() => setDrawerOpen(true)}><Filter data-icon="inline-start" />更多筛选（30+ 维度）</Button></div><DataTable columns={columns} data={filtered} openRowDetails={false} onRowClick={setSelected} detailTitle="企业档案" renderDetails={(row) => <ArchiveDetail row={row} onFollowUp={() => void requestServiceFollowUp(row)} />} /></PageSection>
    <FilterDrawer open={drawerOpen} onOpenChange={setDrawerOpen} title="企业高级筛选" groups={groups} value={drawerValue} onChange={setDrawerValue} onQuery={() => setDrawerOpen(false)} onReset={() => setDrawerValue({})} />
    <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><SheetContent side="right" className="business-detail-sheet"><SheetHeader><SheetTitle>{selected?.name}</SheetTitle><SheetDescription>企业全景档案 · {selected?.industry}</SheetDescription></SheetHeader>{selected && <ArchiveDetail row={selected} onFollowUp={() => void requestServiceFollowUp(selected)} />}</SheetContent></Sheet>
    <Dialog open={importOpen} onOpenChange={setImportOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>批量导入企业档案</DialogTitle><DialogDescription>CSV 首行使用字段名。支持 name、district、industry、scale、socialSecurity、park、tags 等字段。</DialogDescription></DialogHeader><form onSubmit={importCsv} className="archive-import-form"><input id="archive-csv" type="file" accept=".csv,text/csv" required /><p>标签字段可用竖线分隔，例如 高新技术企业|专精特新。</p><div><Button type="button" variant="outline" onClick={() => setImportOpen(false)}>取消</Button><Button type="submit">导入 CSV</Button></div></form></DialogContent></Dialog></div>;
}

function ArchiveDetail({ row, onFollowUp }: { row: Row; onFollowUp: () => void }) {
  return <div className="archive-detail"><div className="business-company-summary"><div className="business-company-mark">{String(row.name).slice(0, 1)}</div><div><h3>{row.name}</h3><p>{row.industry} · {row.scale}企业</p></div></div><dl className="business-detail-list"><div><dt>统一社会信用代码</dt><dd>{row.code}</dd></div><div><dt>注册资本</dt><dd>{row.regCapital}</dd></div><div><dt>注册地址</dt><dd>{row.address}</dd></div><div><dt>所属园区</dt><dd>{row.park}</dd></div><div><dt>社保人数</dt><dd>{row.socialSecurity} 人</dd></div><div><dt>工商变更</dt><dd>{row.businessChange}</dd></div><div><dt>知识产权</dt><dd>{row.patents} 项</dd></div><div><dt>招聘趋势</dt><dd>{row.recruitment}</dd></div><div><dt>经营状态</dt><dd><StatusValue value={row.archiveStatus} /></dd></div></dl><div className="business-chip-row">{(row.tags ?? []).map((tag: string) => <StatusTag key={tag} value={tag} tone="info" />)}</div><Button variant="outline" onClick={onFollowUp}>发起企业服务跟进</Button></div>;
}
