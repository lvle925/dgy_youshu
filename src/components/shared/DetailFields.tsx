import type { ReactNode } from "react";

/** 业务记录字段中文标签，避免在政务界面直接暴露英文技术字段名。 */
export const recordFieldLabels: Record<string, string> = {
  title: "标题", company: "关联企业", name: "名称", companyName: "企业名称", source: "来源", owner: "负责人",
  planDate: "计划日期", priority: "优先级", note: "备注", status: "状态", created: "创建时间",
  createdAt: "创建时间", creator: "创建人", date: "日期", result: "结果", duration: "时长",
  park: "所属园区", parkId: "园区编号", departmentId: "承办部门", ownerId: "执行人编号",
  createdBy: "创建人账号", serviceRequestId: "关联诉求编号", category: "事项类别", dueAt: "办理期限",
  assignedAt: "派单时间", description: "诉求说明", district: "所在区域", region: "企业区域",
  industry: "所属行业", stage: "推进阶段", score: "意愿度", intent: "项目意向", contact: "联系人",
  phone: "联系电话", supervision: "督办状态", visitResult: "走访结果", visitDate: "走访日期",
  city: "所在城市", targetCity: "目标城市", desc: "描述", level: "层级", hot: "热度",
  stars: "关注数", amount: "金额", deadline: "截止日期", materials: "申报材料",
  requirements: "申报条件", org: "发布机构", type: "类型",
};

const internalFields = new Set(["id", "ownerId", "createdBy", "departmentId", "parkId", "serviceRequestId"]);

export function DetailFields({
  row,
  labels,
  exclude = [],
}: {
  row: Record<string, unknown>;
  labels?: Record<string, string>;
  exclude?: string[];
}) {
  const skip = new Set([...internalFields, ...exclude]);
  const entries = Object.entries(row).filter(([key]) => !skip.has(key));
  return (
    <dl className="business-detail-list">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt>{recordFieldLabels[key] ?? labels?.[key] ?? key}</dt>
          <dd>{formatValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatValue(value: unknown): ReactNode {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join("、") || "—";
  if (typeof value === "boolean") return value ? "是" : "否";
  return String(value);
}
