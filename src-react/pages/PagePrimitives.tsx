import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { AlertCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusTag } from "@/../src/components/shared/StatusTag";
import type { CollectionSource } from "@/lib/useBusinessCollection";
import { useCurrentCity } from "@/app/CityContext";

export function PageHeading({
  title,
  description,
  actions,
  source,
  meta,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  source?: CollectionSource;
  /** 页头轻量上下文信息（统计口径、数据时间、视图切换等） */
  meta?: ReactNode;
}) {
  const { city } = useCurrentCity();
  const dataSource = source ?? "local";
  return (
    <header className="business-page-heading">
      <div>
        <div className="business-page-title-line">
          <h1>{title}</h1>
          {dataSource === "unavailable" && <span className="business-data-source business-data-source--offline" role="status">数据服务暂不可用</span>}
          {dataSource === "local" && <span className="business-data-source" role="status" title="当前展示离线演示数据，连接业务系统后自动切换">演示数据</span>}
          {meta && <span className="business-page-meta">{meta}</span>}
        </div>
        {description && <p>{description}</p>}
        {city !== "上海市" && (
          <div className="business-city-scope" role="status">
            当前地区 {city}
          </div>
        )}
      </div>
      {actions && <div className="business-page-actions">{actions}</div>}
    </header>
  );
}

export function PageSection({
  title,
  description,
  actions,
  children,
  className = "",
  error,
  onRetry,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className={`business-section os-glass-card ${className}`}>
      {(title || description || actions) && (
        <CardHeader className="business-section-header">
          <div>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <p>{description}</p>}
          </div>
          {actions && <div className="business-section-actions">{actions}</div>}
        </CardHeader>
      )}
      <CardContent>
        <InlineError message={error} onRetry={onRetry} />
        {children}
      </CardContent>
    </Card>
  );
}

export function InlineError({
  message,
  onRetry,
  tone = "warning",
}: {
  message?: string;
  onRetry?: () => void;
  tone?: "warning" | "info";
}) {
  if (!message) return null;
  return (
    <div className="business-inline-error" data-tone={tone} role="status">
      <AlertCircle aria-hidden="true" />
      <span>{message}</span>
      {onRetry && (
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          重试
        </Button>
      )}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder = "搜索名称、编号或关键词",
  onKeyDown,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="business-search-field">
      <Search aria-hidden="true" />
      <Input value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={onKeyDown} placeholder={placeholder} />
    </div>
  );
}

const ALL_OPTION = "__all__";

export function NativeSelect({
  value,
  onChange,
  options,
  label,
  allowEmpty = true,
  bare = false,
  disabled = false,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[] | Array<{ value: string; label: string }>;
  label: string;
  allowEmpty?: boolean;
  bare?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const items = options.map((option) => typeof option === "string" ? { value: option, label: option } : option);
  return (
    <label className="business-native-select">
      {!bare && <span>{label}</span>}
      <Select
        value={value || (allowEmpty ? ALL_OPTION : items[0]?.value ?? "")}
        onValueChange={(next) => onChange(next === ALL_OPTION ? "" : String(next ?? ""))}
        disabled={disabled}
      >
        <SelectTrigger size="sm" aria-label={label}>
          <SelectValue placeholder={placeholder ?? (allowEmpty ? "全部" : undefined)}>
            {(selected) =>
              selected && selected !== ALL_OPTION
                ? items.find((item) => item.value === selected)?.label ?? String(selected)
                : allowEmpty
                  ? placeholder ?? "全部"
                  : String(value || items[0]?.label || "")
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {allowEmpty && <SelectItem value={ALL_OPTION}>全部</SelectItem>}
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

export function FormField({
  label,
  children,
  required = false,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="business-form-field">
      <span>{label}{required && <b aria-hidden="true">*</b>}</span>
      {children}
    </label>
  );
}

export function RecordFields({ record }: { record: Record<string, unknown> }) {
  const entries = Object.entries(record).filter(([key]) => key !== "id");
  return (
    <dl className="business-record-fields">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{Array.isArray(value) ? value.join("、") : String(value ?? "—")}</dd>
        </div>
      ))}
    </dl>
  );
}

export function StatusValue({ value }: { value: unknown }) {
  return <StatusTag value={String(value ?? "未知")} />;
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  submitLabel = "保存",
  busy = false,
  width = "max-w-xl",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel?: string;
  busy?: boolean;
  width?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`business-form-dialog ${width}`}>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="business-form-grid">{children}</div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={busy}>{busy ? "保存中…" : submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SectionTabs({
  items,
  value,
  onChange,
}: {
  items: Array<{ key: string; label: string; count?: number }>;
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="business-section-tabs" role="tablist">
      {items.map((item) => (
        <button key={item.key} type="button" role="tab" aria-selected={value === item.key} className={value === item.key ? "is-active" : ""} onClick={() => onChange(item.key)}>
          {item.label}{item.count !== undefined && <span>{item.count.toLocaleString()}</span>}
        </button>
      ))}
    </div>
  );
}

export function DetailList({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <dl className="business-detail-list">
      {items.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
    </dl>
  );
}
