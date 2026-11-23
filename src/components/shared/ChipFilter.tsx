import { Check, ChevronDown, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ChipFilterGroup = {
  key: string;
  label: string;
  options: string[];
  limit?: number;
};
export type ChipFilterValue = Record<string, string[]>;

export function matchesChipFilter<T>(
  row: T,
  groups: ChipFilterGroup[],
  value: ChipFilterValue,
  readValues: (row: T, groupKey: string) => string | string[] | undefined,
) {
  return groups.every((group) => {
    const selected = value[group.key] ?? [];
    if (selected.length === 0) return true;
    const rowValues = readValues(row, group.key);
    const values = Array.isArray(rowValues)
      ? rowValues
      : rowValues
        ? [rowValues]
        : [];
    return selected.some((option) => values.includes(option));
  });
}

export function ChipFilter({
  groups,
  value,
  onChange,
  onSearch,
  onReset,
  keywordPlaceholder = "请输入关键词",
}: {
  groups: ChipFilterGroup[];
  value: ChipFilterValue;
  onChange: (next: ChipFilterValue) => void;
  onSearch?: (keyword: string) => void;
  onReset?: () => void;
  keywordPlaceholder?: string;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [keyword, setKeyword] = useState("");
  const selected = useMemo(
    () =>
      groups.flatMap((group) =>
        (value[group.key] ?? []).map((item) => ({
          group: group.key,
          label: `${group.label}：${item}`,
          value: item,
        })),
      ),
    [groups, value],
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
  const remove = (group: string, option: string) =>
    onChange({
      ...value,
      [group]: (value[group] ?? []).filter((item) => item !== option),
    });
  return (
    <div className="chip-filter os-glass-card" aria-label="筛选条件">
      {selected.length > 0 && (
        <div className="chip-filter-selected">
          <span className="chip-filter-label">已选条件</span>
          {selected.map((item) => (
            <button
              type="button"
              className="chip-filter-selected-chip"
              key={`${item.group}-${item.value}`}
              onClick={() => remove(item.group, item.value)}
            >
              {item.label}
              <X aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
      <div className="chip-filter-groups">
        {groups.map((group) => {
          const isExpanded = expanded[group.key] ?? false;
          const options = isExpanded
            ? group.options
            : group.options.slice(0, group.limit ?? 10);
          return (
            <div className="chip-filter-group" key={group.key}>
              <div className="chip-filter-group-label">{group.label}</div>
              <div className="chip-filter-options">
                {options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={cn(
                      "chip-filter-chip",
                      (value[group.key] ?? []).includes(option) &&
                        "chip-filter-chip--active",
                    )}
                    aria-pressed={(value[group.key] ?? []).includes(option)}
                    onClick={() => toggle(group.key, option)}
                  >
                    {(value[group.key] ?? []).includes(option) && (
                      <Check aria-hidden="true" />
                    )}
                    {option}
                  </button>
                ))}
                {group.options.length > options.length && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="chip-filter-more"
                    onClick={() =>
                      setExpanded((current) => ({
                        ...current,
                        [group.key]: !isExpanded,
                      }))
                    }
                  >
                    {isExpanded ? "收起" : "更多"}
                    <ChevronDown aria-hidden="true" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {(onSearch || onReset) && (
        <div className="chip-filter-actions">
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSearch?.(keyword);
            }}
            placeholder={keywordPlaceholder}
          />
          <Button onClick={() => onSearch?.(keyword)}>查询</Button>
          <Button
            variant="outline"
            onClick={() => {
              setKeyword("");
              onChange({});
              onReset?.();
            }}
          >
            重置
          </Button>
        </div>
      )}
    </div>
  );
}
