import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  title,
  value,
  description,
  delta,
  deltaLabel = "环比",
  icon,
  variant = "surface",
  emphasis = "default",
  hint,
  footer,
  onClick,
}: {
  title: string;
  value: ReactNode;
  description?: string;
  delta?: number;
  deltaLabel?: string;
  icon?: ReactNode;
  variant?: "gradient" | "surface";
  /** 主锚点卡：霁蓝鎏金强调条 + 微渐变底 + 柔光图标，与次卡形成 1+N 节奏 */
  emphasis?: "primary" | "default";
  /** 趋势/占比等辅助标签 */
  hint?: ReactNode;
  footer?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Card
      className={cn(
        "shared-metric-card",
        `shared-metric-card--${variant}`,
        emphasis === "primary" && "shared-metric-card--primary",
        onClick && "is-clickable",
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onClick(); } } : undefined}
    >
      <CardHeader>
        <CardDescription>
          {icon && <span className="shared-metric-icon">{icon}</span>}
          {title}
          {hint && <span className="shared-metric-hint">{hint}</span>}
        </CardDescription>
        <CardTitle>{value}</CardTitle>
      </CardHeader>
      <CardContent>
        {delta !== undefined && (
          <span
            className={cn(
              "shared-metric-delta",
              delta >= 0 ? "is-up" : "is-down",
            )}
          >
            {delta >= 0 ? (
              <ArrowUpRight aria-hidden="true" />
            ) : (
              <ArrowDownRight aria-hidden="true" />
            )}
            {Math.abs(delta)}% {deltaLabel}
          </span>
        )}
        {description && <p>{description}</p>}
        {footer}
      </CardContent>
    </Card>
  );
}
