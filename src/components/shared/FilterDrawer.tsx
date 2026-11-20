import { ChevronDown, RotateCcw, Search, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type FilterDrawerGroup = {
  key: string;
  label: string;
  options: string[];
};
export function FilterDrawer({
  open,
  onOpenChange,
  groups,
  value,
  onChange,
  onQuery,
  onReset,
  title = "筛选条件",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: FilterDrawerGroup[];
  value: Record<string, string[]>;
  onChange: (next: Record<string, string[]>) => void;
  onQuery: () => void;
  onReset: () => void;
  title?: string;
}) {
  const [keyword, setKeyword] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const selected = groups.flatMap((group) =>
    (value[group.key] ?? []).map((item) => ({
      key: group.key,
      label: `${group.label}：${item}`,
      value: item,
    })),
  );
  const toggle = (key: string, option: string) => {
    const current = value[key] ?? [];
    onChange({
      ...value,
      [key]: current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option],
    });
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="filter-drawer">
        <SheetHeader className="filter-drawer-header">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>可组合多个维度筛选数据</SheetDescription>
        </SheetHeader>
        <div className="filter-drawer-selected">
          {selected.length ? (
            selected.map((item) => (
              <button
                type="button"
                key={`${item.key}-${item.value}`}
                aria-label={`移除${item.label}`}
                onClick={() => toggle(item.key, item.value)}
              >
                {item.label}
                <X aria-hidden="true" />
              </button>
            ))
          ) : (
            <span>暂无已选条件</span>
          )}
        </div>
        <div className="filter-drawer-body">
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索筛选项"
          />
          <div className="filter-drawer-groups">
            {groups.map((group) => (
              <section key={group.key} className="filter-drawer-group">
                <button
                  type="button"
                  className="filter-drawer-group-title"
                  aria-expanded={!collapsed[group.key]}
                  onClick={() =>
                    setCollapsed((current) => ({
                      ...current,
                      [group.key]: !current[group.key],
                    }))
                  }
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    className={cn(collapsed[group.key] && "rotate-[-90deg]")}
                  />
                </button>
                {!collapsed[group.key] && (
                  <div className="filter-drawer-options">
                    {group.options
                      .filter((option) => option.includes(keyword))
                      .map((option) => (
                        <button
                          type="button"
                          key={option}
                          className={cn(
                            (value[group.key] ?? []).includes(option) &&
                              "is-selected",
                          )}
                          aria-pressed={(value[group.key] ?? []).includes(
                            option,
                          )}
                          onClick={() => toggle(group.key, option)}
                        >
                          {option}
                        </button>
                      ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
        <SheetFooter className="filter-drawer-footer">
          <Button
            variant="outline"
            onClick={() => {
              onChange({});
              onReset();
            }}
          >
            <RotateCcw data-icon="inline-start" />
            重置
          </Button>
          <Button onClick={onQuery}>
            <Search data-icon="inline-start" />
            查询
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
