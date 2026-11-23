import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { ActionButton } from "@/app/AccessContext";
import { api } from "../../../src/api.js";
import { useState } from "react";
import { KeyRound, Settings2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusTag } from "@/../src/components/shared/StatusTag";
import { settingConfig } from "../../../src/data/mock.js";
import { FormField, PageHeading, PageSection, SectionTabs } from "@/pages/PagePrimitives";

const emptySettings: Array<{ id: string; [key: string]: any }> = [];

export function SettingPage() {
  const [tab, setTab] = useState("basic");
  const collection = useBusinessCollection({ key: "youshu-tenant-settings", seed: emptySettings, apiCollection: "tenantSettings" });
  const [draft, setDraft] = useState<Record<string, any> | null>(null);
  const [saving, setSaving] = useState(false);
  const saved = draft ?? collection.rows.find(row => row.id === "workspace") ?? {
    brand: settingConfig.portalName,
    phone: settingConfig.contact,
    company: settingConfig.address,
    intro: settingConfig.slogan,
    themeColor: "#1652B8",
    bannerTitle: settingConfig.portalName,
    bannerSub: settingConfig.slogan,
    footer: "© 2026 有数计划产业招商服务平台",
    modules: settingConfig.modules.map((name, index) => ({ id: `module-${index}`, name, enabled: true })),
    notices: { smsAlert: true, migrationAlert: true, policyAlert: true, visitReminder: true },
  };
  const update = (field: string, value: unknown) => setDraft({ ...saved, [field]: value });
  const moduleToggle = (id: string) => update("modules", saved.modules.map((item: any) => item.id === id ? { ...item, enabled: !item.enabled } : item));
  return <div className="business-page"><PageHeading title="门店装修" description="维护招商门户品牌信息、首页展示模块与消息接收规则" actions={<ActionButton action="编辑" disabled={saving || collection.loading || !!collection.error} onClick={async () => { setSaving(true); try { await api.saveConfig("tenantSettings", "workspace", saved); await collection.refresh(); setDraft(null); toast.success("设置已保存"); } catch (error) { toast.error(error instanceof Error ? error.message : "设置保存失败"); } finally { setSaving(false); } }}><CheckIcon />保存设置</ActionButton>} /><PageSection description={collection.error || undefined}><SectionTabs items={[{ key: "basic", label: "基本信息" }, { key: "decorate", label: "门店装修" }, { key: "modules", label: "模块配置" }, { key: "security", label: "账号安全" }, { key: "notice", label: "消息通知" }]} value={tab} onChange={setTab} />
    {tab === "basic" && <div className="settings-layout"><div className="settings-form"><FormField label="平台名称"><Input value={saved.brand} onChange={(event) => update("brand", event.target.value)} /></FormField><FormField label="企业服务电话"><Input value={saved.phone} onChange={(event) => update("phone", event.target.value)} /></FormField><FormField label="运营单位"><Input value={saved.company} onChange={(event) => update("company", event.target.value)} /></FormField><FormField label="平台介绍"><Textarea value={saved.intro} onChange={(event) => update("intro", event.target.value)} rows={5} /></FormField></div><div className="tenant-preview"><span>门户预览</span><strong>{saved.brand}</strong><p>{saved.intro}</p><small>{saved.phone}</small></div></div>}
    {tab === "decorate" && <div className="settings-layout"><div className="settings-form"><FormField label="主题色"><div className="theme-color-input"><Input type="color" value={saved.themeColor} onChange={(event) => update("themeColor", event.target.value)} /><Input value={saved.themeColor} onChange={(event) => update("themeColor", event.target.value)} /></div></FormField><FormField label="首页主标题"><Input value={saved.bannerTitle} onChange={(event) => update("bannerTitle", event.target.value)} /></FormField><FormField label="首页副标题"><Input value={saved.bannerSub} onChange={(event) => update("bannerSub", event.target.value)} /></FormField><FormField label="页脚备案信息"><Input value={saved.footer} onChange={(event) => update("footer", event.target.value)} /></FormField></div><div className="tenant-preview tenant-preview--banner" style={{ borderColor: saved.themeColor }}><strong>{saved.bannerTitle}</strong><p>{saved.bannerSub}</p><span style={{ background: saved.themeColor }}>查看产业服务</span></div></div>}
    {tab === "modules" && <div className="setting-modules-list">{saved.modules.map((item: any, index: number) => <div key={item.id}><span className="module-order">{String(index + 1).padStart(2, "0")}</span><div><strong>{item.name}</strong><small>门户首页展示模块</small></div><button type="button" className={`switch-button ${item.enabled ? "is-on" : ""}`} aria-pressed={item.enabled} onClick={() => moduleToggle(item.id)}><span /></button></div>)}</div>}
    {tab === "security" && <div className="security-settings"><div><span className="settings-icon"><KeyRound /></span><div><strong>登录密码</strong><p>当前工作台使用本地管理员账号和图片验证码登录。</p></div><Button variant="outline" onClick={() => toast.info("本地后端暂未提供密码修改接口")}>修改密码</Button></div><div><span className="settings-icon"><ShieldCheck /></span><div><strong>二次验证</strong><p>新设备验证和 90 天可信设备记录需要后端认证服务支持。</p></div><StatusTag value="未配置" tone="neutral" /></div></div>}
    {tab === "notice" && <div className="setting-modules-list">{Object.entries(saved.notices).map(([key, enabled]) => <div key={key}><span className="settings-icon"><Settings2 /></span><div><strong>{{ smsAlert: "短信提醒", migrationAlert: "迁移风险提醒", policyAlert: "政策到期提醒", visitReminder: "走访计划提醒" }[key] || key}</strong><small>控制工作台内的对应消息提醒</small></div><button type="button" className={`switch-button ${enabled ? "is-on" : ""}`} aria-pressed={Boolean(enabled)} onClick={() => update("notices", { ...saved.notices, [key]: !enabled })}><span /></button></div>)}</div>}
    </PageSection></div>;
}

function CheckIcon() { return <span data-icon="inline-start">✓</span>; }
