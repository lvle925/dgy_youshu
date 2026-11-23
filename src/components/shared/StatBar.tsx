import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatBarItem = {
  label: string;
  value: ReactNode;
  suffix?: string;
  tone?: "default" | "gold" | "success";
};
export function StatBar({
  items,
  scope = "当前筛选结果",
  className,
}: {
  items: StatBarItem[];
  scope?: string;
  className?: string;
}) {
  return (
    <section className={cn("stat-bar os-glass-card", className)} aria-label={`${scope}统计`}>
      <div className="stat-bar-scope">
        <span className="stat-bar-dot" />
        {scope === "全库口径" ? "全库总量" : scope === "当前筛选" ? "当前筛选结果" : scope}
      </div>
      <div className="stat-bar-items">
        {items.slice(0, 5).map((item) => (
          <div className="stat-bar-item" key={item.label}>
            <span>{item.label}</span>
            <strong className={cn(item.tone && `stat-bar-value--${item.tone}`)}>
              {item.value}
            </strong>
            {item.suffix && <small>{item.suffix}</small>}
          </div>
        ))}
      </div>
    </section>
  );
}
