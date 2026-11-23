import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatusTone = "success" | "warning" | "danger" | "neutral" | "info";
const statusMap: Record<string, { label: string; tone: StatusTone }> = {
  成功: { label: "成功", tone: "success" },
  已完成: { label: "已完成", tone: "success" },
  启用: { label: "启用", tone: "success" },
  正常: { label: "正常", tone: "success" },
  安全: { label: "安全", tone: "success" },
  已发布: { label: "已发布", tone: "success" },
  已审核: { label: "已审核", tone: "success" },
  通过: { label: "通过", tone: "success" },
  警告: { label: "警告", tone: "warning" },
  督办: { label: "督办", tone: "warning" },
  高: { label: "高", tone: "warning" },
  中风险: { label: "中风险", tone: "warning" },
  待走访: { label: "待走访", tone: "warning" },
  待处理: { label: "待处理", tone: "warning" },
  处理中: { label: "处理中", tone: "warning" },
  申报中: { label: "申报中", tone: "warning" },
  待审核: { label: "待审核", tone: "warning" },
  报名中: { label: "报名中", tone: "warning" },
  高危: { label: "高危", tone: "danger" },
  驳回: { label: "驳回", tone: "danger" },
  高风险: { label: "高风险", tone: "danger" },
  异常: { label: "异常", tone: "danger" },
  已取消: { label: "已取消", tone: "danger" },
  已截止: { label: "已截止", tone: "danger" },
  已驳回: { label: "已驳回", tone: "danger" },
  失败: { label: "失败", tone: "danger" },
  已注销: { label: "已注销", tone: "danger" },
  已吊销: { label: "已吊销", tone: "danger" },
  已迁出: { label: "已迁出", tone: "danger" },
  低风险: { label: "低风险", tone: "info" },
  低: { label: "低", tone: "info" },
  停用: { label: "停用", tone: "neutral" },
  中: { label: "中", tone: "neutral" },
};

const toneClasses: Record<StatusTone, string> = {
  success: "status-tag--success",
  warning: "status-tag--warning",
  danger: "status-tag--danger",
  neutral: "status-tag--neutral",
  info: "status-tag--info",
};

export function StatusTag({
  value,
  tone,
  children,
  className,
}: {
  value?: string;
  tone?: StatusTone;
  children?: ReactNode;
  className?: string;
}) {
  const label = value ?? (typeof children === "string" ? children : "未知");
  const mapping = statusMap[label];
  return (
    <span
      className={cn(
        "status-tag",
        toneClasses[tone ?? mapping?.tone ?? "neutral"],
        className,
      )}
    >
      <span className="status-led" aria-hidden="true" />
      {mapping?.label ?? label}
    </span>
  );
}

export type { StatusTone };
