import { ActionButton } from "@/app/AccessContext";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { api } from "../../../src/api.js";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, PageHeading, PageSection, SectionTabs } from "@/pages/PagePrimitives";
import { BellRing, Building2, KeyRound, Save, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Settings = Record<string, any> & { id: string };
const emptySettings: Settings[] = [];
const defaults: Record<string, any> = {
  governmentUnit: "区级招商服务中心",
  governmentLogo: "",
  disclaimer: "本工作台用于政府委办局及产业园区内部招商和企业服务工作，业务数据依职责授权使用。",
  dataUpdateCycleHours: 24,
  watermarkEnabled: true,
  passwordMinLength: 12,
  requirePasswordLetter: true,
  requirePasswordNumber: true,
  sessionTimeoutMinutes: 30,
  dailyCallWarning: 10000,
  monthlyCallWarning: 200000,
  notices: { migrationAlert: true, serviceOverdue: true, visitReminder: true, accountSecurity: true },
};

export function SettingPage() {
  const [tab, setTab] = useState("unit");
  const collection = useBusinessCollection<Settings>({ key: "youshu-tenant-settings", seed: emptySettings, apiCollection: "tenantSettings" });
  const [draft, setDraft] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const saved: Settings = draft ?? collection.rows.find((row) => row.id === "workspace") ?? { id: "workspace", ...defaults } as Settings;
  const update = (field: string, value: unknown) => setDraft({ ...saved, [field]: value });
  const checkbox = (field: string, label: string, description: string) => <label className="system-setting-toggle" key={field}><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" checked={Boolean(saved[field])} onChange={(event) => update(field, event.target.checked)} /></label>;

  async function save() {
    setSaving(true);
    try {
      await api.saveConfig("tenantSettings", "workspace", saved);
      await collection.refresh();
      setDraft(null);
      window.dispatchEvent(new Event("workspace-access-changed"));
      toast.success("系统策略已保存到 MySQL");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "设置保存失败");
    } finally { setSaving(false); }
  }

  return <div className="business-page">
    <PageHeading title="系统与门户配置" description="维护政府单位信息、政务免责声明、防泄密水印和账号安全策略" source={collection.source} actions={<ActionButton action="编辑" disabled={saving || collection.loading || Boolean(collection.error)} onClick={() => void save()}><Save data-icon="inline-start" />保存系统策略</ActionButton>} />
    <PageSection description={collection.error || undefined}>
      <SectionTabs items={[{ key: "unit", label: "单位信息" }, { key: "portal", label: "政务门户" }, { key: "security", label: "账号与保密" }, { key: "notice", label: "运行提醒" }]} value={tab} onChange={setTab} />
      {tab === "unit" && <div className="settings-layout"><div className="settings-form">
        <FormField label="政府单位名称"><Input value={saved.governmentUnit} onChange={(event) => update("governmentUnit", event.target.value)} /></FormField>
        <FormField label="单位徽标地址"><Input value={saved.governmentLogo} onChange={(event) => update("governmentLogo", event.target.value)} placeholder="可填写内部可访问的图片地址" /></FormField>
        <FormField label="数据更新周期说明"><Input type="number" min={1} max={720} value={saved.dataUpdateCycleHours} onChange={(event) => update("dataUpdateCycleHours", Number(event.target.value))} /></FormField>
      </div><div className="tenant-preview"><span><Building2 /> 内部工作台单位标识</span><strong>{saved.governmentUnit}</strong><p>数据更新周期约 {saved.dataUpdateCycleHours} 小时</p></div></div>}
      {tab === "portal" && <div className="settings-form settings-form--wide">
        <FormField label="政务免责声明"><Textarea rows={5} value={saved.disclaimer} onChange={(event) => update("disclaimer", event.target.value)} /></FormField>
        <p className="text-muted-foreground">免责声明将展示于内部门户的说明区域，并随运行简报保留数据范围说明。</p>
      </div>}
      {tab === "security" && <div className="system-security-grid">
        <section className="system-security-card"><span className="settings-icon"><ShieldCheck /></span><div><strong>密码复杂度</strong><p>首次登录、管理员重置和账号初始化均使用当前规则。</p></div><FormField label="最少字符数"><Input type="number" min={12} max={64} value={saved.passwordMinLength} onChange={(event) => update("passwordMinLength", Number(event.target.value))} /></FormField>{checkbox("requirePasswordLetter", "必须包含英文字母", "新密码校验规则")}{checkbox("requirePasswordNumber", "必须包含数字", "新密码校验规则")}</section>
        <section className="system-security-card"><span className="settings-icon"><KeyRound /></span><div><strong>会话与防泄密</strong><p>超时后服务端会话过期，强制下线会立即撤销该成员所有会话。</p></div><FormField label="无操作自动登出（分钟）"><Input type="number" min={5} max={240} value={saved.sessionTimeoutMinutes} onChange={(event) => update("sessionTimeoutMinutes", Number(event.target.value))} /></FormField>{checkbox("watermarkEnabled", "启用全站防泄密水印", "显示姓名、所属部门和当前时间，适用于业务页与运行简报")}</section>
      </div>}
      {tab === "notice" && <div className="settings-layout"><div className="settings-form settings-form--wide">
        <FormField label="每日接口调用预警阈值"><Input type="number" min={1} value={saved.dailyCallWarning} onChange={(event) => update("dailyCallWarning", Number(event.target.value))} /></FormField>
        <FormField label="每月接口调用预警阈值"><Input type="number" min={1} value={saved.monthlyCallWarning} onChange={(event) => update("monthlyCallWarning", Number(event.target.value))} /></FormField>
        <div className="settings-notice-list">{Object.entries({ migrationAlert: "迁移风险预警", serviceOverdue: "企业诉求超期督办", visitReminder: "走访工单提醒", accountSecurity: "账号安全事件" }).map(([key, label]) => checkbox(key, label, "显示在内部通知中心"))}</div>
      </div><div className="tenant-preview"><span><BellRing /> 运行提醒</span><strong>业务预警与接口监控阈值</strong><p>接口监控按 MySQL 中的真实请求审计记录聚合。</p></div></div>}
    </PageSection>
  </div>;
}
