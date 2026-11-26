import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { AlertCircle, Database, Search } from "lucide-react";
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
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  source?: CollectionSource;
}) {
  const { city } = useCurrentCity();
  const dataSource = source ?? "local";
  return (
    <header className="business-page-heading">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
        {dataSource === "unavailable" && <div className="business-data-source" role="status"><Database aria-hidden="true" />业务数据暂不可用</div>}
        {dataSource === "local" && (
          <div className="business-data-source" role="status">
            <Database aria-hidden="true" />
            当前使用本地演示数据
          </div>
        )}
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
}: {
  message?: string;
  onRetry?: () => void;
}) {
  if (!message) return null;
  return (
    <div className="business-inline-error" role="alert">
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
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[] | Array<{ value: string; label: string }>;
  label: string;
  allowEmpty?: boolean;
  bare?: boolean;
}) {
  const items = options.map((option) => typeof option === "string" ? { value: option, label: option } : option);
  return (
    <label className="business-native-select">
      {!bare && <span>{label}</span>}
      <Select
        value={value || (allowEmpty ? ALL_OPTION : items[0]?.value ?? "")}
        onValueChange={(next) => onChange(next === ALL_OPTION ? "" : String(next ?? ""))}
      >
        <SelectTrigger size="sm" aria-label={label}>
          <SelectValue>
            {(selected) =>
              selected && selected !== ALL_OPTION
                ? items.find((item) => item.value === selected)?.label ?? String(selected)
                : allowEmpty
                  ? "全部"
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
