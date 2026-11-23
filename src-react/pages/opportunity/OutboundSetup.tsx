import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentCity } from "@/app/CityContext";
import { allowsRoute, useAllowedAction, usePrincipal } from "@/app/AccessContext";
import { PageHeading, PageSection, FormField } from "@/pages/PagePrimitives";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { api } from "../../../src/api.js";

type Script = { id: string; city: string; opening: string; qa: string; ending: string };
const empty: Script[] = [];
const steps = [
  { field: "opening", title: "开场话术" },
  { field: "qa", title: "常见问题与回答" },
  { field: "ending", title: "结束话术" },
] as const;
const views = [
  ["外呼任务", "/business/aiOutbound/tasks"],
  ["通话记录", "/business/aiOutbound/records"],
  ["数据看板", "/business/aiOutbound/dashboard"],
];

export function OutboundSetup({ title, children }: { title: string; children: ReactNode }) {
  const { city } = useCurrentCity();
  const principal = usePrincipal();
  const data = useBusinessCollection({ key: "youshu-ai-scripts", seed: empty, apiCollection: "aiScripts" });
  const script = data.rows.find(row => row.city === city);
  const [editing, setEditing] = useState(false);
  const canCreate = useAllowedAction("新增");
  const canEdit = useAllowedAction("编辑");
  return <div className="business-page">
    <PageHeading title={title} description={city + " · AI 外呼中心"} source={data.source}
      actions={script && !editing && canEdit ? <Button variant="outline" onClick={() => setEditing(true)}>编辑话术</Button> : undefined} />
    <nav aria-label="AI 外呼视图" className="business-toolbar os-glass-card">
      {views.filter(([, path]) => allowsRoute(principal, path)).map(([name, path]) =>
        <Button key={path} variant="ghost" render={<Link to={path} />}>{name}</Button>)}
    </nav>
    {data.error ? <PageSection title="话术配置读取失败"><p>{data.error}</p><Button onClick={() => void data.refresh()}>重试</Button></PageSection>
      : data.loading ? <PageSection title="正在读取话术配置" />
      : script && !editing ? children
      : (script ? canEdit : canCreate) ? <ScriptStepper key={city} city={city} existing={script} onSave={async () => { await data.refresh(); setEditing(false); }} onCancel={script ? () => setEditing(false) : undefined} />
      : <PageSection title="等待配置话术" description="请联系具备话术配置权限的成员完成配置。" />}
  </div>;
}

function ScriptStepper({ city, existing, onSave, onCancel }: {
  city: string;
  existing?: Script;
  onSave: () => Promise<void>;
  onCancel?: () => void;
}) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [script, setScript] = useState(existing ?? {
    city,
    opening: "您好，这里是" + city + "产业招商服务中心，想了解贵司下一步布局需求。",
    qa: "我们可以为您匹配" + city + "的政策、园区载体和产业链合作资源。",
    ending: "感谢您的时间，稍后将由专员与您联系。",
  });
  const current = steps[step];
  return <PageSection title="配置 AI 外呼话术" description="确认三个环节后，开放当前地区的任务、通话记录与数据看板。">
    <ol className="outbound-steps">{steps.map(({ field, title }, index) => <li aria-current={index === step ? "step" : undefined} key={field}>{index + 1} · {title}</li>)}</ol>
    <form className="grid gap-4" onSubmit={async event => {
      event.preventDefault();
      if (!script[current.field].trim() || saving) return;
      if (step < steps.length - 1) { setStep(step + 1); return; }
      setSaving(true);
      try {
        await api.saveConfig("aiScripts", city, script);
        await onSave();
        toast.success("外呼话术已保存");
      } catch (cause) { toast.error(cause instanceof Error ? cause.message : "保存失败"); }
      finally { setSaving(false); }
    }}>
      <FormField label={current.title} required>
        <Textarea key={current.field} value={script[current.field]} onChange={event => setScript({ ...script, [current.field]: event.target.value })} required rows={5} maxLength={4000} />
      </FormField>
      <div className="business-toolbar">
        {step > 0 && <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>上一步</Button>}
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>取消</Button>}
        <Button type="submit" disabled={saving}>{step < steps.length - 1 ? "下一步" : saving ? "保存中…" : "保存并开放外呼中心"}</Button>
      </div>
    </form>
  </PageSection>;
}
