import { useMemo, useState, type FormEvent } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, Edit3, KeyRound, Plus, Search, Settings2, ShieldCheck, Store, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type DataColumn } from "@/../src/components/shared/DataTable";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { PermissionTree, type PermissionNode } from "@/../src/components/shared/PermissionTree";
import { StatusTag } from "@/../src/components/shared/StatusTag";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { billing, logStatSeries, logs, members, roles, settingConfig } from "../../src/data/mock.js";
import { navigationGroups } from "@/app/navigation";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { FormDialog, FormField, NativeSelect, PageHeading, PageSection, SearchField, SectionTabs, StatusValue } from "@/pages/PagePrimitives";

type Row = Record<string, any> & { id: string | number };
const normalizedLogs = (logs as Row[]).map((row) => ({
  ...row,
  title: row.action,
  operator: row.user,
  type: row.module,
  content: row.target,
}));

function useSavedSetting<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try { const saved = localStorage.getItem(key); return saved ? JSON.parse(saved) as T : initial; } catch { return initial; }
  });
  const save = (next: T) => { setValue(next); localStorage.setItem(key, JSON.stringify(next)); };
  return [value, save] as const;
}

export function SettingPage() {
  const [tab, setTab] = useState("basic");
  const [saved, save] = useSavedSetting<Record<string, any>>("youshu-tenant-setting", {
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
  });
  const update = (field: string, value: unknown) => save({ ...saved, [field]: value });
  const moduleToggle = (id: string) => update("modules", saved.modules.map((item: any) => item.id === id ? { ...item, enabled: !item.enabled } : item));
  return <div className="business-page"><PageHeading title="门店装修" description="维护招商门户品牌信息、首页展示模块与消息接收规则" actions={<Button onClick={() => toast.success("设置已保存到此浏览器")}><CheckIcon />保存设置</Button>} /><PageSection><SectionTabs items={[{ key: "basic", label: "基本信息" }, { key: "decorate", label: "门店装修" }, { key: "modules", label: "模块配置" }, { key: "security", label: "账号安全" }, { key: "notice", label: "消息通知" }]} value={tab} onChange={setTab} />
    {tab === "basic" && <div className="settings-layout"><div className="settings-form"><FormField label="平台名称"><Input value={saved.brand} onChange={(event) => update("brand", event.target.value)} /></FormField><FormField label="企业服务电话"><Input value={saved.phone} onChange={(event) => update("phone", event.target.value)} /></FormField><FormField label="运营单位"><Input value={saved.company} onChange={(event) => update("company", event.target.value)} /></FormField><FormField label="平台介绍"><Textarea value={saved.intro} onChange={(event) => update("intro", event.target.value)} rows={5} /></FormField></div><div className="tenant-preview"><span>门户预览</span><strong>{saved.brand}</strong><p>{saved.intro}</p><small>{saved.phone}</small></div></div>}
    {tab === "decorate" && <div className="settings-layout"><div className="settings-form"><FormField label="主题色"><div className="theme-color-input"><Input type="color" value={saved.themeColor} onChange={(event) => update("themeColor", event.target.value)} /><Input value={saved.themeColor} onChange={(event) => update("themeColor", event.target.value)} /></div></FormField><FormField label="首页主标题"><Input value={saved.bannerTitle} onChange={(event) => update("bannerTitle", event.target.value)} /></FormField><FormField label="首页副标题"><Input value={saved.bannerSub} onChange={(event) => update("bannerSub", event.target.value)} /></FormField><FormField label="页脚备案信息"><Input value={saved.footer} onChange={(event) => update("footer", event.target.value)} /></FormField></div><div className="tenant-preview tenant-preview--banner" style={{ borderColor: saved.themeColor }}><strong>{saved.bannerTitle}</strong><p>{saved.bannerSub}</p><span style={{ background: saved.themeColor }}>查看产业服务</span></div></div>}
    {tab === "modules" && <div className="setting-modules-list">{saved.modules.map((item: any, index: number) => <div key={item.id}><span className="module-order">{String(index + 1).padStart(2, "0")}</span><div><strong>{item.name}</strong><small>门户首页展示模块</small></div><button type="button" className={`switch-button ${item.enabled ? "is-on" : ""}`} aria-pressed={item.enabled} onClick={() => moduleToggle(item.id)}><span /></button></div>)}</div>}
    {tab === "security" && <div className="security-settings"><div><span className="settings-icon"><KeyRound /></span><div><strong>登录密码</strong><p>当前工作台使用本地管理员账号和图片验证码登录。</p></div><Button variant="outline" onClick={() => toast.info("本地后端暂未提供密码修改接口")}>修改密码</Button></div><div><span className="settings-icon"><ShieldCheck /></span><div><strong>二次验证</strong><p>新设备验证和 90 天可信设备记录需要后端认证服务支持。</p></div><StatusTag value="未配置" tone="neutral" /></div></div>}
    {tab === "notice" && <div className="setting-modules-list">{Object.entries(saved.notices).map(([key, enabled]) => <div key={key}><span className="settings-icon"><Settings2 /></span><div><strong>{{ smsAlert: "短信提醒", migrationAlert: "迁移风险提醒", policyAlert: "政策到期提醒", visitReminder: "走访计划提醒" }[key] || key}</strong><small>控制工作台内的对应消息提醒</small></div><button type="button" className={`switch-button ${enabled ? "is-on" : ""}`} aria-pressed={Boolean(enabled)} onClick={() => update("notices", { ...saved.notices, [key]: !enabled })}><span /></button></div>)}</div>}
    </PageSection></div>;
}

function CheckIcon() { return <span data-icon="inline-start">✓</span>; }

export function MemberPage() {
  const data = useBusinessCollection<Row>({ key: "youshu-members", seed: members, apiCollection: "members" });
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", role: "招商专员", dept: "招商运营部", park: "全部园区", status: "启用" });
  const filtered = data.rows.filter((row) => (!keyword || `${row.name} ${row.phone}`.includes(keyword)) && (!status || row.status === status));
  const columns: DataColumn<Row>[] = [{ key: "name", header: "姓名", sortable: true }, { key: "phone", header: "手机号" }, { key: "role", header: "角色" }, { key: "dept", header: "所属部门" }, { key: "park", header: "数据范围" }, { key: "lastLogin", header: "最近登录", sortable: true }, { key: "status", header: "状态", cell: (row) => <StatusValue value={row.status} /> }, { key: "action", header: "操作", cell: (row) => <div className="table-action-buttons"><Button size="sm" variant="ghost" onClick={() => edit(row)}>编辑</Button><Button size="sm" variant="ghost" onClick={() => void data.updateRecord(row.id, { status: row.status === "启用" ? "停用" : "启用" }).then(() => toast.success("成员状态已更新"))}>{row.status === "启用" ? "停用" : "启用"}</Button></div> }];
  function edit(row?: Row) { setEditing(row ?? null); setForm(row ? { name: row.name, phone: row.phone, role: row.role, dept: row.dept, park: row.park, status: row.status } : { name: "", phone: "", role: "招商专员", dept: "招商运营部", park: "全部园区", status: "启用" }); setFormOpen(true); }
  async function saveMember(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!form.name.trim() || !form.phone.trim()) return toast.warning("请填写姓名和手机号"); try { if (editing) await data.updateRecord(editing.id, form); else await data.createRecord({ ...form, lastLogin: "暂无登录记录" } as Omit<Row, "id">); setFormOpen(false); toast.success(editing ? "成员信息已更新" : "成员已创建"); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "成员保存失败"); } }
  return <div className="business-page"><PageHeading title="人员管理" description="管理平台成员、角色分配、园区数据范围与账号状态" source={data.source} actions={<Button onClick={() => edit()}><Plus data-icon="inline-start" />添加管理员</Button>} /><div className="business-metric-grid"><MetricCard title="成员总数" value={data.rows.length} description="平台账号" icon={<Users />} /><MetricCard title="启用成员" value={data.rows.filter((row) => row.status === "启用").length} description="可正常登录" /><MetricCard title="招商团队" value={data.rows.filter((row) => String(row.dept).includes("招商")).length} description="招商运营部门" /><MetricCard title="停用账号" value={data.rows.filter((row) => row.status === "停用").length} description="暂不可登录" /></div><PageSection title="成员列表" description={`共 ${filtered.length} 位成员`}><div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="姓名或手机号" /><NativeSelect label="账号状态" value={status} onChange={setStatus} options={["启用", "停用"]} /></div><DataTable columns={columns} data={filtered} openRowDetails={false} onRowClick={(row) => edit(row)} detailTitle="成员信息" /></PageSection>
    <FormDialog open={formOpen} onOpenChange={setFormOpen} title={editing ? "编辑成员" : "添加管理员"} description="成员和角色配置由本地业务数据保存，当前后端未启用细粒度鉴权。" onSubmit={saveMember}><FormField label="姓名" required><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></FormField><FormField label="手机号" required><Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required /></FormField><FormField label="角色"><select className="business-input" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>{(roles as Row[]).map((role) => <option key={role.id}>{role.name}</option>)}</select></FormField><FormField label="所属部门"><Input value={form.dept} onChange={(event) => setForm({ ...form, dept: event.target.value })} /></FormField><FormField label="数据范围"><select className="business-input" value={form.park} onChange={(event) => setForm({ ...form, park: event.target.value })}><option>全部园区</option>{[...new Set(members.map((item) => item.park))].filter((item) => item !== "全部园区").map((item) => <option key={item}>{item}</option>)}</select></FormField><FormField label="账号状态"><select className="business-input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>启用</option><option>停用</option></select></FormField></FormDialog></div>;
}

const permissionNodes: PermissionNode[] = navigationGroups.map((group) => ({
  id: `menu:${group.title}`,
  label: group.title,
  children: [
    ...group.sections.flatMap((section) => section.items.map((item) => ({ id: `route:${item.path}`, label: item.title }))),
    ...["新增", "编辑", "删除", "导出"].map((action) => ({ id: `button:${group.title}:${action}`, label: `${action}操作` })),
  ],
}));

function permissionsForRole(role: Row) {
  const saved = Array.isArray(role.permissions) ? role.permissions : [];
  if (saved.length) return saved as string[];

  const labels = new Set(Array.isArray(role.perms) ? role.perms : []);
  if (labels.has("全部菜单")) {
    return permissionNodes.flatMap((group) => [group.id, ...(group.children ?? []).map((child) => child.id)]);
  }

  const selected: string[] = [];
  permissionNodes.forEach((group) => {
    const selectedChildren = (group.children ?? []).filter((child) =>
      labels.has(group.label) || labels.has(child.label) ||
      (labels.has("数据导出") && child.id.endsWith(":导出")) ||
      (labels.has("成员管理") && group.label === "平台管理" && /:(新增|编辑|删除)$/.test(child.id)),
    );
    if (selectedChildren.length) selected.push(group.id, ...selectedChildren.map((child) => child.id));
  });
  return selected;
}

function labelsForPermissions(selected: string[]) {
  const ids = new Set(selected);
  return permissionNodes.flatMap((group) => (group.children ?? [])
    .filter((child) => ids.has(child.id))
    .map((child) => child.label));
}

export function RolePage() {
  const data = useBusinessCollection<Row>({ key: "youshu-roles", seed: roles, apiCollection: "roles" });
  const [keyword, setKeyword] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", desc: "", status: "启用", perms: [] as string[] });
  const filtered = data.rows.filter((row) => !keyword || `${row.name} ${row.desc}`.includes(keyword));
  const columns: DataColumn<Row>[] = [{ key: "name", header: "角色名称", sortable: true }, { key: "code", header: "角色编码" }, { key: "desc", header: "角色说明" }, { key: "members", header: "绑定成员", sortable: true }, { key: "status", header: "状态", cell: (row) => <StatusValue value={row.status ?? "启用"} /> }, { key: "action", header: "操作", cell: (row) => <Button size="sm" variant="outline" onClick={() => edit(row)}>配置权限</Button> }];
  function edit(row?: Row) { setEditing(row ?? null); setForm(row ? { name: row.name, desc: row.desc, status: row.status ?? "启用", perms: permissionsForRole(row) } : { name: "", desc: "", status: "启用", perms: [] }); setOpen(true); }
  async function saveRole(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!form.name.trim()) return toast.warning("请输入角色名称"); const labels = labelsForPermissions(form.perms); try { if (editing) await data.updateRecord(editing.id, { ...editing, name: form.name, desc: form.desc, status: form.status, permissions: form.perms, perms: labels }); else await data.createRecord({ name: form.name, code: `role_${Date.now()}`, desc: form.desc, status: form.status, members: 0, perms: labels, permissions: form.perms } as Omit<Row, "id">); setOpen(false); toast.success("角色权限已保存"); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "角色保存失败"); } }
  return <div className="business-page"><PageHeading title="角色管理" description="按菜单与操作按钮配置角色权限范围" source={data.source} actions={<Button onClick={() => edit()}><Plus data-icon="inline-start" />新增角色</Button>} /><PageSection title="角色列表" description={`共 ${filtered.length} 个角色`}><div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="搜索角色名称" /></div><DataTable columns={columns} data={filtered} openRowDetails={false} onRowClick={(row) => edit(row)} detailTitle="角色配置" /></PageSection><FormDialog open={open} onOpenChange={setOpen} title={editing ? `编辑角色 · ${editing.name}` : "新增角色"} description="勾选子权限时会自动保留父级菜单权限" onSubmit={saveRole} width="max-w-4xl"><FormField label="角色名称" required><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></FormField><FormField label="角色状态"><select className="business-input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>启用</option><option>停用</option></select></FormField><FormField label="角色说明"><Input value={form.desc} onChange={(event) => setForm({ ...form, desc: event.target.value })} /></FormField><div className="role-tree-field"><span>权限配置</span><PermissionTree nodes={permissionNodes} value={form.perms} onChange={(perms) => setForm({ ...form, perms })} /></div></FormDialog></div>;
}

export function MemberLogPage() {
  const data = useBusinessCollection<Row>({ key: "youshu-operation-logs-v2", seed: normalizedLogs });
  const [keyword, setKeyword] = useState("");
  const [operator, setOperator] = useState("");
  const [type, setType] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const filtered = data.rows.filter((row) => (!keyword || `${row.title} ${row.content}`.includes(keyword)) && (!operator || row.operator === operator) && (!type || row.type === type));
  return <div className="business-page"><PageHeading title="操作日志" description="审计平台内的账号、数据和配置变更行为" source={data.source} actions={<Button variant="outline" onClick={() => toast.success("日志已导出为 CSV")}><Download data-icon="inline-start" />导出日志</Button>} /><PageSection title="操作记录" description={`共 ${filtered.length} 条`}><div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="搜索操作内容或对象" /><NativeSelect label="操作人" value={operator} onChange={setOperator} options={[...new Set(data.rows.map((row) => row.operator))]} /><NativeSelect label="操作类型" value={type} onChange={setType} options={[...new Set(data.rows.map((row) => row.type))]} /></div><DataTable columns={[{ key: "title", header: "操作事项", sortable: true }, { key: "operator", header: "操作人" }, { key: "type", header: "操作类型", cell: (row) => <StatusValue value={row.type} /> }, { key: "content", header: "操作内容" }, { key: "ip", header: "IP 地址" }, { key: "time", header: "操作时间", sortable: true }]} data={filtered} openRowDetails={false} onRowClick={setSelected} detailTitle="操作日志详情" /></PageSection><Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><SheetContent side="right" className="business-detail-sheet"><SheetHeader><SheetTitle>{selected?.title}</SheetTitle><SheetDescription>操作审计详情</SheetDescription></SheetHeader>{selected && <dl className="business-detail-list">{Object.entries(selected).filter(([key]) => key !== "id").map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value ?? "—")}</dd></div>)}</dl>}</SheetContent></Sheet></div>;
}

export function MemberLogStatisticsPage() {
  const data = useBusinessCollection<Row>({ key: "youshu-operation-logs-v2", seed: normalizedLogs });
  const series = logStatSeries.map((item, index) => ({ ...item, id: `log-stat-${index}` }));
  const byOperator = Object.entries(data.rows.reduce((totals: Record<string, number>, row) => { const key = String(row.operator ?? "其他"); totals[key] = (totals[key] ?? 0) + 1; return totals; }, {})).map(([name, value]) => ({ name, value }));
  const typeData = Object.entries(data.rows.reduce((totals: Record<string, number>, row) => { const key = String(row.type ?? "其他"); totals[key] = (totals[key] ?? 0) + 1; return totals; }, {})).map(([name, value]) => ({ name, value }));
  return <div className="business-page"><PageHeading title="操作日志统计" description="查看平台操作量趋势、操作人员分布和事件类型" source={data.source} /><div className="business-metric-grid"><MetricCard title="日志总量" value={data.rows.length.toLocaleString()} description="留存审计记录" icon={<Search />} /><MetricCard title="活跃操作人" value={byOperator.length} description="统计范围内" /><MetricCard title="今日操作" value={data.rows.filter((row) => String(row.time).startsWith(new Date().toISOString().slice(0, 10))).length} description="按本机日期统计" /><MetricCard title="操作类型" value={typeData.length} description="覆盖平台业务事件" /></div><div className="business-chart-grid"><PageSection title="近 7 日操作趋势"><div className="business-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={series}><CartesianGrid vertical={false} stroke="#e7ebf0" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Bar dataKey="count" name="操作次数" fill="#1652B8" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></PageSection><PageSection title="事件类型分布"><div className="business-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={typeData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={90}>{typeData.map((item, index) => <Cell key={item.name} fill={["#1652B8", "#147A4C", "#C8922E", "#5C8ED5", "#64748B"][index % 5]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></PageSection></div><PageSection title="操作人排行" description="按审计记录数量排序"><DataTable columns={[{ key: "name", header: "操作人" }, { key: "value", header: "操作次数", sortable: true }]} data={byOperator.map((item, index) => ({ ...item, id: `operator-${index}` }))} /></PageSection></div>;
}

export function InterfaceBillingPage() {
  const [tab, setTab] = useState("usage");
  const [keyword, setKeyword] = useState("");
  const [period, setPeriod] = useState("本月");
  const rows = (billing.records as Row[]).filter((row) => !keyword || `${row.item} ${row.type}`.includes(keyword));
  return <div className="business-page"><PageHeading title="接口计费" description="查看接口调用量、账户余额、计费明细和套餐信息" actions={<><Button variant="outline" onClick={() => toast.info("本地演示环境暂不支持账户充值")}>账户充值</Button><Button variant="outline" onClick={() => toast.success("账单已导出")}><Download data-icon="inline-start" />导出账单</Button></>} /><div className="business-metric-grid"><MetricCard title="账户余额" value={`¥ ${billing.balance.toLocaleString()}`} description={`${billing.plan} · 到期 ${billing.expire}`} variant="gradient" icon={<KeyRound />} /><MetricCard title="本月已用" value={`¥ ${billing.monthlyUsage.toLocaleString()}`} description="按接口请求计费" /><MetricCard title="接口调用量" value={billing.apiCalls.toLocaleString()} description="本统计周期" /><MetricCard title="成功率" value={`${billing.successRate}%`} description="调用成功请求占比" /></div><PageSection title="计费明细" description="查看接口调用、充值与到账记录"><SectionTabs items={[{ key: "usage", label: "计费明细", count: billing.records.length }, { key: "apis", label: "已开通接口" }, { key: "keys", label: "接口密钥" }]} value={tab} onChange={setTab} />{tab === "usage" && <><div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="接口名称或账单类型" /><NativeSelect label="统计周期" value={period} onChange={setPeriod} options={["本月", "上月", "近 90 天", "本年度"]} /></div><DataTable columns={[{ key: "date", header: "发生时间", sortable: true }, { key: "type", header: "类型", cell: (row) => <StatusValue value={row.type} /> }, { key: "item", header: "接口 / 项目名称" }, { key: "count", header: "调用次数", sortable: true }, { key: "amount", header: "发生金额", sortable: true, cell: (row) => `¥ ${Number(row.amount).toFixed(2)}` }, { key: "status", header: "状态", cell: (row) => <StatusValue value={row.status} /> }]} data={rows} detailTitle="账单记录" /></>}{tab === "apis" && <div className="billing-api-grid">{["企业工商信息查询", "企业风险信息查询", "政策数据同步", "企业图谱查询", "招投标数据查询"].map((name, index) => <article key={name}><span className="api-product-icon">API</span><strong>{name}</strong><p>接口调用服务 · {index % 2 ? "按次计费" : "套餐额度内"}</p><StatusTag value="已开通" tone="success" /><Button variant="outline" size="sm" onClick={() => toast.info(`${name} 契约详情暂未配置`)}>查看接口</Button></article>)}</div>}{tab === "keys" && <div className="billing-key-panel"><KeyRound /><div><strong>接口密钥</strong><p>密钥由平台管理员在真实计费服务中配置。演示环境不展示或生成真实凭据。</p></div><StatusTag value="未配置" tone="neutral" /></div>}</PageSection></div>;
}
