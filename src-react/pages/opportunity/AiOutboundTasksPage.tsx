import { useState } from "react";
import { toast } from "sonner";
import { useCurrentCity } from "@/app/CityContext";
import { ActionButton, usePrincipal } from "@/app/AccessContext";
import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { DataTable } from "@/../src/components/shared/DataTable";
import { Input } from "@/components/ui/input";
import { FormDialog, FormField, NativeSelect, PageSection, SearchField, StatusValue } from "@/pages/PagePrimitives";
import { OutboundSetup } from "./OutboundSetup";

type Task = { id: string; name: string; city: string; scene: string; owner: string; status: string; total: number; connected: number; intent: number; created: string };
const empty: Task[] = [];
const scenes = ["招商线索首访", "园区企业回访", "政策申报提醒", "安商稳商关怀"];

export default function AiOutboundTasksPage() {
  return <OutboundSetup title="外呼任务"><TaskTable /></OutboundSetup>;
}

function TaskTable() {
  const { city } = useCurrentCity();
  const principal = usePrincipal();
  const tasks = useBusinessCollection({ key: "youshu-ai-tasks", seed: empty, apiCollection: "aiTasks" });
  const [keyword, setKeyword] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scene, setScene] = useState(scenes[0]);
  const visible = tasks.rows.filter(row => row.city === city && (row.name + row.scene).includes(keyword.trim()));
  return <PageSection title="任务管理" description="创建任务并维护演示执行状态" actions={<ActionButton action="新增" onClick={() => setOpen(true)}>新建任务</ActionButton>}>
    <div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="搜索任务名称或场景" /></div>
    <DataTable data={visible} detailTitle="任务详情" columns={[
      { key: "name", header: "任务名称", sortable: true }, { key: "scene", header: "场景" },
      { key: "total", header: "拨打" }, { key: "connected", header: "接通" }, { key: "intent", header: "有意向" },
      { key: "owner", header: "负责人" }, { key: "status", header: "状态", cell: row => <StatusValue value={row.status} /> },
      { key: "action", header: "操作", cell: row => row.status !== "已完成" && <ActionButton action="编辑" variant="outline" size="sm" onClick={() => {
        const status = row.status === "进行中" ? "已暂停" : "进行中";
        void tasks.updateRecord(row.id, { status }).then(() => toast.success("任务状态已更新")).catch(error => toast.error(error.message));
      }}>{row.status === "进行中" ? "暂停" : "启动"}</ActionButton> },
    ]} />
    <FormDialog open={open} onOpenChange={setOpen} title="新建外呼任务" onSubmit={async event => {
      event.preventDefault();
      if (!name.trim() || !scene) return;
      try {
        await tasks.createRecord({ name: name.trim(), city, scene, owner: principal?.user ?? "", status: "待启动", total: 0, connected: 0, intent: 0, created: new Date().toISOString().slice(0, 10) });
        setOpen(false); setName(""); toast.success("外呼任务已创建");
      } catch (error) { toast.error(error instanceof Error ? error.message : "创建失败"); }
    }}>
      <FormField label="任务名称" required><Input value={name} onChange={e => setName(e.target.value)} required /></FormField>
      <NativeSelect label="外呼场景" value={scene} onChange={setScene} options={scenes} />
    </FormDialog>
  </PageSection>;
}
