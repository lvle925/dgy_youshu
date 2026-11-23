import { useCurrentCity } from "@/app/CityContext";
import { useAllowedAction, usePrincipal } from "@/app/AccessContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "../../../src/api.js";
import { saveBlob } from "@/lib/exportCsv";
import { FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Brief = {
  generatedAt: string;
  city: string;
  park: string;
  policyCount: number;
  projectCount: number;
  projectStages: Record<string, number>;
  requestCount: number;
  requestClosed: number;
  requestOverdue: number;
  migrationCount: number;
  migrationHighRisk: number;
};

export function OperationBriefDialog({ city: selectedCity, park = "" }: { city?: string; park?: string }) {
  const { city: currentCity } = useCurrentCity();
  const principal = usePrincipal();
  const location = window.location.pathname;
  const canExport = useAllowedAction("导出");
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(false);
  const city = selectedCity || currentCity;

  async function loadBrief() {
    setOpen(true);
    setLoading(true);
    try {
      const query = new URLSearchParams({ city, park });
      const response = await fetch(`/api/reports/operation-brief?${query}`, { credentials: "same-origin" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "运行简报生成失败");
      setBrief(result as Brief);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "运行简报生成失败");
      setOpen(false);
    } finally { setLoading(false); }
  }

  async function exportBrief() {
    if (!brief) return;
    try {
      await api.auditExport({ route: location, name: `${brief.city}运行简报`, count: 1 });
      const timestamp = new Date(brief.generatedAt).toLocaleString("zh-CN", { hour12: false });
      const watermark = `${principal?.displayName || principal?.user || "内部用户"} · ${principal?.departmentName || "政府内部用户"} · ${timestamp}`;
      const content = renderBriefHtml(brief, watermark, principal?.watermarkEnabled !== false);
      saveBlob(`${brief.city}招商稳商运行简报.html`, new Blob([content], { type: "text/html;charset=utf-8" }));
      toast.success("运行简报已导出");
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "简报导出失败"); }
  }

  return <>
    <Button variant="outline" onClick={() => void loadBrief()}><FileText data-icon="inline-start" />生成运行简报</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="operation-brief-dialog">
        <DialogHeader><DialogTitle>招商稳商运行简报</DialogTitle><DialogDescription>{brief ? `${brief.city}${brief.park ? ` · ${brief.park}` : ""} · 生成于 ${new Date(brief.generatedAt).toLocaleString("zh-CN", { hour12: false })}` : "按当前授权范围汇总运行数据"}</DialogDescription></DialogHeader>
        {loading && <p className="text-muted-foreground">正在汇总 MySQL 台账数据…</p>}
        {brief && <div className="operation-brief-preview">
          <section><h3>政策服务</h3><p>当前范围内政策记录 <strong>{brief.policyCount}</strong> 项。</p></section>
          <section><h3>招商项目推进</h3><p>项目台账 <strong>{brief.projectCount}</strong> 项。{Object.entries(brief.projectStages).map(([stage, count]) => `${stage} ${count} 项`).join("，")}</p></section>
          <section><h3>企业诉求办理</h3><p>受理 <strong>{brief.requestCount}</strong> 项，已办结 {brief.requestClosed} 项，超期未办结 {brief.requestOverdue} 项。</p></section>
          <section><h3>迁移风险预警</h3><p>监测企业 <strong>{brief.migrationCount}</strong> 家，其中高风险 {brief.migrationHighRisk} 家。</p></section>
          <small>统计数据来自当前 MySQL 业务台账和用户授权的数据范围。</small>
        </div>}
        {brief && canExport && <div className="operation-brief-actions"><Button variant="outline" onClick={() => setOpen(false)}>返回工作台</Button><Button onClick={() => void exportBrief()}>导出标准简报</Button></div>}
      </DialogContent>
    </Dialog>
  </>;
}

function renderBriefHtml(brief: Brief, watermark: string, watermarkEnabled: boolean) {
  const escape = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
  const stageLines = Object.entries(brief.projectStages).map(([stage, count]) => `<li>${escape(stage)}：${count} 项</li>`).join("");
  const watermarkLayer = watermarkEnabled ? `<div class="watermark">${escape(watermark)}</div>` : "";
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>${escape(brief.city)}招商稳商运行简报</title><style>@page{size:A4;margin:22mm}body{font-family:"Microsoft YaHei",sans-serif;color:#18283b;line-height:1.8}.report{max-width:760px;margin:auto}h1{font-size:24px;margin-bottom:4px}h2{margin-top:28px;font-size:16px;color:#1652B8}p,li{font-size:14px}.meta{color:#64748b}.watermark{position:fixed;inset:45% 4% auto;z-index:-1;color:#334155;opacity:.12;font-size:15px;transform:rotate(-24deg);white-space:nowrap}@media print{.watermark{z-index:0}}</style>${watermarkLayer}<main class="report"><h1>招商稳商运行简报</h1><p class="meta">统计范围 ${escape(brief.city)}${brief.park ? ` · ${escape(brief.park)}` : ""}</p><p class="meta">生成时间 ${escape(new Date(brief.generatedAt).toLocaleString("zh-CN", { hour12: false }))}</p><h2>一、政策服务</h2><p>当前授权范围内政策记录 ${brief.policyCount} 项。</p><h2>二、招商项目推进</h2><p>项目台账共 ${brief.projectCount} 项，分阶段情况如下。</p><ul>${stageLines}</ul><h2>三、企业诉求办理</h2><p>受理 ${brief.requestCount} 项，已办结 ${brief.requestClosed} 项，超期未办结 ${brief.requestOverdue} 项。</p><h2>四、迁移风险预警</h2><p>监测企业 ${brief.migrationCount} 家，其中高风险 ${brief.migrationHighRisk} 家。</p><p class="meta">数据范围依据当前登录账号的园区授权生成。</p></main></html>`;
}
