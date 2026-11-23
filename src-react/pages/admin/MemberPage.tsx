import { ActionButton, useAllowedAction, usePrincipal } from "@/app/AccessContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { api } from "../../../src/api.js";
import { DataTable, type DataColumn } from "@/../src/components/shared/DataTable";
import { MetricCard } from "@/../src/components/shared/MetricCard";
import { members, parks, roles } from "../../../src/data/mock.js";
import { FormDialog, FormField, NativeSelect, PageHeading, PageSection, SearchField, StatusValue } from "@/pages/PagePrimitives";
import { Download, Plus, Upload, UserRound, UserRoundX } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { useReportExport } from "@/app/ReportQueue";

type Row = Record<string, any> & { id: string | number };
type LockState = { username: string; failedAttempts: number; lockedUntil: number };
const emptyDepartments: Row[] = [];

export function MemberPage() {
  const data = useBusinessCollection<Row>({ key: "youshu-members", seed: members, apiCollection: "members" });
  const roleData = useBusinessCollection<Row>({ key: "youshu-roles", seed: roles, apiCollection: "roles" });
  const departmentData = useBusinessCollection<Row>({ key: "youshu-departments", seed: emptyDepartments, apiCollection: "departments" });
  const principal = usePrincipal();
  const enqueue = useReportExport();
  const canEdit = useAllowedAction("编辑");
  const [lockStates, setLockStates] = useState<LockState[]>([]);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [scope, setScope] = useState("");
  const [removing, setRemoving] = useState<Row | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<Row | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const blankForm = { name: "", phone: "", role: "", roleId: "", username: "", initialPassword: "", departmentId: "", dept: "", dataScope: "ASSIGNED_PARKS", parkIds: [] as string[], park: "", status: "启用", validUntil: "" };
  const [form, setForm] = useState(blankForm);

  const departmentNameById = useMemo(() => new Map(departmentData.rows.map((item) => [String(item.id), String(item.name)])), [departmentData.rows]);
  const lockByUsername = useMemo(() => new Map(lockStates.map((item) => [item.username, item])), [lockStates]);
  const filtered = data.rows.filter((row) =>
    (!keyword || `${row.name} ${row.phone} ${row.username ?? ""}`.includes(keyword))
    && (!status || row.status === status)
    && (!departmentFilter || String(row.departmentId ?? "") === String(departmentData.rows.find((item) => item.name === departmentFilter)?.id ?? "") || row.dept === departmentFilter)
    && (!roleFilter || row.role === roleFilter || roleData.rows.find((item) => String(item.id) === String(row.roleId))?.name === roleFilter)
    && (!scope || row.dataScope === scope),
  );

  useEffect(() => {
    api.memberLockStates().then(setLockStates).catch(() => setLockStates([]));
  }, []);

  const columns: DataColumn<Row>[] = [
    { key: "name", header: "姓名", sortable: true },
    { key: "phone", header: "手机号" },
    { key: "role", header: "角色", cell: (row) => row.role || roleData.rows.find((item) => String(item.id) === String(row.roleId))?.name || "未分配" },
    { key: "dept", header: "所属部门", cell: (row) => departmentNameById.get(String(row.departmentId ?? "")) || row.dept || "未分配" },
    { key: "scope", header: "数据范围", cell: (row) => scopeLabel(row.dataScope, row.parkIds, row.park) },
    { key: "validUntil", header: "账号有效期", cell: (row) => row.validUntil || "长期" },
    { key: "lock", header: "安全状态", cell: (row) => (lockByUsername.get(row.username)?.lockedUntil ?? 0) > Date.now() ? <StatusValue value="已锁定" /> : <StatusValue value={row.status} /> },
    { key: "action", header: "操作", cell: (row) => <div className="table-action-buttons">
      <ActionButton action="编辑" size="sm" variant="ghost" onClick={() => openEditor(row)}>编辑</ActionButton>
      {row.username && <ActionButton action="编辑" size="sm" variant="ghost" onClick={() => setPasswordTarget(row)}>重置密码</ActionButton>}
      {lockByUsername.has(String(row.username)) && <ActionButton action="编辑" size="sm" variant="ghost" onClick={() => void unlock(row)}>人工解锁</ActionButton>}
      {row.username && <ActionButton action="编辑" size="sm" variant="ghost" onClick={() => void forceLogout(row)}>强制下线</ActionButton>}
      <ActionButton action="删除" size="sm" variant="ghost" onClick={() => setRemoving(row)}>删除</ActionButton>
    </div> },
  ];

  function openEditor(row?: Row) {
    setEditing(row ?? null);
    const assignedRoleId = row?.roleId ?? roleData.rows.find((item) => item.name === row?.role)?.id ?? "";
    const assignedDepartment = departmentData.rows.find((item) => String(item.id) === String(row?.departmentId ?? ""));
    setForm(row ? {
      ...blankForm,
      name: row.name,
      phone: row.phone,
      role: row.role ?? roleData.rows.find((item) => String(item.id) === String(assignedRoleId))?.name ?? "",
      roleId: String(assignedRoleId),
      username: row.username ?? "",
      departmentId: String(row.departmentId ?? ""),
      dept: assignedDepartment?.name ?? row.dept ?? "",
      dataScope: row.dataScope ?? (row.park === "全部园区" ? "ALL_PARKS" : "ASSIGNED_PARKS"),
      parkIds: Array.isArray(row.parkIds) ? row.parkIds.map(String) : row.park && row.park !== "全部园区" ? [row.park] : [],
      park: row.park ?? "",
      status: row.status ?? "启用",
      validUntil: row.validUntil ?? "",
    } : blankForm);
    setFormOpen(true);
  }

  async function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) return toast.warning("请填写姓名");
    if (!principal?.role || principal.role !== "安全保密员") {
      if (form.username && !form.roleId) return toast.warning("请为登录账号分配角色");
      if (form.username && !form.initialPassword && !editing) return toast.warning("新登录账号须设置初始密码");
    }
    const selectedRole = roleData.rows.find((item) => String(item.id) === form.roleId);
    const department = departmentData.rows.find((item) => String(item.id) === form.departmentId);
    const assignedParks = form.dataScope === "ASSIGNED_PARKS" ? form.parkIds : [];
    const payload: Partial<Row> = principal?.role === "安全保密员"
      ? { dataScope: form.dataScope, parkIds: assignedParks, park: assignedParks.join("、") }
      : { ...form, dept: department?.name ?? form.dept, role: selectedRole?.name ?? form.role, roleId: form.roleId, parkIds: assignedParks, park: form.dataScope === "ALL_PARKS" ? "全部园区" : assignedParks.join("、"), ownerId: form.username || undefined };
    try {
      if (editing) await data.updateRecord(editing.id, payload);
      else await data.createRecord({ ...payload, lastLogin: "暂无登录记录" } as Omit<Row, "id">);
      setFormOpen(false);
      toast.success(editing ? "成员信息已更新" : "成员已创建");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "成员保存失败");
    }
  }

  async function refreshLockStates() {
    setLockStates(await api.memberLockStates());
  }

  async function unlock(row: Row) {
    try { await api.memberUnlock(row.id); await refreshLockStates(); toast.success("账号已人工解锁"); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "解锁失败"); }
  }

  async function forceLogout(row: Row) {
    if (!window.confirm(`确定强制下线 ${row.name} 的全部登录会话吗？`)) return;
    try { await api.memberForceLogout(row.id); toast.success("该成员的登录会话已失效"); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "强制下线失败"); }
  }

  async function submitResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordTarget) return;
    try {
      await api.memberResetPassword(passwordTarget.id, resetPassword);
      setPasswordTarget(null);
      setResetPassword("");
      toast.success("密码已重置，成员下次登录须修改密码");
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "密码重置失败"); }
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const rows = parseMemberCsv(await file.text(), departmentData.rows, roleData.rows);
      const result = await api.memberImport(rows);
      await data.refresh();
      toast.success(`已原子导入 ${result.count} 位成员`);
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "导入失败，未写入本批数据"); }
    finally { event.target.value = ""; }
  }

  const exportRows: Row[] = filtered.map((row): Row => ({ ...row, roleName: row.role || roleData.rows.find((item) => String(item.id) === String(row.roleId))?.name, departmentName: departmentNameById.get(String(row.departmentId ?? "")) || row.dept, scopeName: scopeLabel(row.dataScope, row.parkIds, row.park) }));

  return <div className="business-page">
    <PageHeading title="人员管理" description="维护部门、角色、数据范围、账号安全策略和人员有效期" source={data.source} actions={<>
      <input ref={fileInput} type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => void importFile(event)} />
      <ActionButton action="新增" variant="outline" onClick={() => fileInput.current?.click()}><Upload data-icon="inline-start" />批量导入</ActionButton>
      <ActionButton action="导出" variant="outline" onClick={() => enqueue("成员台账.csv", [
        { header: "姓名", value: (row) => row.name }, { header: "手机号", value: (row) => row.phone },
        { header: "登录账号", value: (row) => row.username }, { header: "角色", value: (row) => row.roleName },
        { header: "所属部门", value: (row) => row.departmentName }, { header: "数据范围", value: (row) => row.scopeName },
        { header: "账号有效期", value: (row) => row.validUntil }, { header: "状态", value: (row) => row.status },
      ], exportRows)}><Download data-icon="inline-start" />导出成员</ActionButton>
      <ActionButton action="新增" onClick={() => openEditor()}><Plus data-icon="inline-start" />添加成员</ActionButton>
    </>} />
    <div className="business-metric-grid">
      <MetricCard title="成员总数" value={data.rows.length} description="组织内成员" icon={<UserRound />} />
      <MetricCard title="启用成员" value={data.rows.filter((row) => row.status === "启用").length} description="可正常登录" />
      <MetricCard title="已锁定账号" value={lockStates.length} description="连续登录失败触发" icon={<UserRoundX />} />
      <MetricCard title="账号到期" value={data.rows.filter((row) => row.validUntil && row.validUntil < new Date().toISOString().slice(0, 10)).length} description="须由管理员延期" />
    </div>
    <PageSection title="成员列表" description={`当前筛选 ${filtered.length} 人`}>
      <div className="business-toolbar member-filter-toolbar">
        <SearchField value={keyword} onChange={setKeyword} placeholder="姓名、手机号或登录账号" />
        <NativeSelect label="所属部门" value={departmentFilter} onChange={setDepartmentFilter} options={departmentData.rows.map((row) => String(row.name))} />
        <NativeSelect label="角色" value={roleFilter} onChange={setRoleFilter} options={roleData.rows.map((row) => String(row.name))} />
        <NativeSelect label="数据范围" value={scope} onChange={setScope} options={["ALL_PARKS", "ASSIGNED_PARKS", "SELF_ONLY"]} />
        <NativeSelect label="账号状态" value={status} onChange={setStatus} options={["启用", "停用"]} />
      </div>
      <DataTable columns={columns} data={filtered} openRowDetails={false} />
    </PageSection>

    <FormDialog open={formOpen} onOpenChange={setFormOpen} title={editing ? "编辑成员与授权" : "添加成员"} description="登录账号首次登录时必须修改初始密码。三员角色由系统管理员分配。" onSubmit={saveMember} width="max-w-3xl">
      <FormField label="姓名" required><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></FormField>
      <FormField label="手机号"><Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></FormField>
      <FormField label="所属部门"><select className="business-input" value={form.departmentId} disabled={principal?.role === "安全保密员"} onChange={(event) => setForm({ ...form, departmentId: event.target.value })}><option value="">选择部门</option>{departmentData.rows.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></FormField>
      <FormField label="角色"><select className="business-input" value={form.roleId} disabled={principal?.role === "安全保密员"} onChange={(event) => { const selected = roleData.rows.find((item) => String(item.id) === event.target.value); setForm({ ...form, roleId: event.target.value, role: selected?.name ?? "" }); }}><option value="">选择角色</option>{roleData.rows.filter((item) => item.status === "启用").map((item) => <option key={item.id} value={item.id}>{item.name}{item.exclusiveGroup ? " · 三员角色" : ""}</option>)}</select></FormField>
      <FormField label="登录账号"><Input autoComplete="off" disabled={principal?.role === "安全保密员"} value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></FormField>
      {!editing && <FormField label="初始密码"><Input type="password" autoComplete="new-password" minLength={12} disabled={principal?.role === "安全保密员"} value={form.initialPassword} onChange={(event) => setForm({ ...form, initialPassword: event.target.value })} /></FormField>}
      <FormField label="数据范围"><select className="business-input" value={form.dataScope} onChange={(event) => setForm({ ...form, dataScope: event.target.value, parkIds: event.target.value === "ASSIGNED_PARKS" ? form.parkIds : [] })}><option value="ALL_PARKS">全部园区</option><option value="ASSIGNED_PARKS">指定园区</option><option value="SELF_ONLY">仅本人负责</option></select></FormField>
      {form.dataScope === "ASSIGNED_PARKS" && <FormField label="授权园区"><select className="business-input" multiple value={form.parkIds} onChange={(event) => setForm({ ...form, parkIds: Array.from(event.target.selectedOptions, (option) => option.value) })}>{(parks as Row[]).map((park) => <option key={park.id} value={park.name}>{park.name}</option>)}</select></FormField>}
      <FormField label="账号有效期"><Input type="date" value={form.validUntil} onChange={(event) => setForm({ ...form, validUntil: event.target.value })} /></FormField>
      <FormField label="账号状态"><select className="business-input" disabled={principal?.role === "安全保密员"} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>启用</option><option>停用</option></select></FormField>
    </FormDialog>

    <FormDialog open={Boolean(passwordTarget)} onOpenChange={(open) => { if (!open) { setPasswordTarget(null); setResetPassword(""); } }} title="管理员重置密码" description={`${passwordTarget?.name} 下次登录时须修改新密码`} onSubmit={submitResetPassword}>
      <FormField label="新初始密码" required><Input type="password" autoComplete="new-password" minLength={12} value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} required /></FormField>
    </FormDialog>

    <FormDialog open={Boolean(removing)} onOpenChange={(open) => !open && setRemoving(null)} title="删除成员" description={removing?.name} submitLabel="确认删除" onSubmit={async (event) => { event.preventDefault(); if (!removing) return; try { await data.removeRecord(removing.id); setRemoving(null); toast.success("成员已删除"); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "删除失败"); } }} />
  </div>;
}

function scopeLabel(scope: string | undefined, parkIds: string[] | undefined, park: string | undefined) {
  if (scope === "ALL_PARKS" || park === "全部园区") return "全部园区";
  if (scope === "SELF_ONLY") return "仅本人负责";
  return parkIds?.length ? parkIds.join("、") : park || "未授权园区";
}

function parseMemberCsv(text: string, departments: Row[], roles: Row[]) {
  const rows = parseCsv(text.replace(/^\uFEFF/, "").trim());
  if (rows.length < 2) throw new Error("CSV 文件缺少成员数据");
  const headers = rows[0].map((item) => item.trim());
  const field = (record: string[], header: string) => record[headers.indexOf(header)]?.trim() ?? "";
  return rows.slice(1).filter((record) => record.some((value) => value.trim())).map((record) => {
    const departmentName = field(record, "所属部门");
    const roleName = field(record, "角色");
    const parkText = field(record, "园区");
    const dataScope = field(record, "数据范围") || (parkText ? "ASSIGNED_PARKS" : "ALL_PARKS");
    const department = departments.find((item) => item.name === departmentName);
    const role = roles.find((item) => item.name === roleName);
    return {
      name: field(record, "姓名"), phone: field(record, "手机号"), username: field(record, "登录账号"),
      initialPassword: field(record, "初始密码"), role: roleName, roleId: role?.id ?? "",
      dept: departmentName, departmentId: department?.id ?? "", dataScope,
      park: parkText, parkIds: parkText ? parkText.split(/[、;；|]/).map((value) => value.trim()).filter(Boolean) : [],
      validUntil: field(record, "账号有效期"), status: field(record, "状态") || "启用",
    };
  });
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += character;
  }
  row.push(cell);
  if (row.some((value) => value.length)) rows.push(row);
  return rows;
}
