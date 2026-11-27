import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Columns3,
  ChevronRight,
  Inbox,
  RotateCcw,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type DataColumn<T> = {
  key: string;
  header: string;
  accessor?: (row: T) => string | number | null | undefined;
  cell?: (row: T) => ReactNode;
  /** 双行富信息单元格：主标题 + 副信息（地址/编码等），拉开扫描层级 */
  primary?: boolean;
  subtext?: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
  defaultVisible?: boolean;
};

/** 语义色阶：正常霁蓝、优秀翡翠绿、预警琥珀、高危朱红 */
export type ProgressTone = "info" | "success" | "warning" | "danger";

/**
 * 内联微型进度条：用于入驻率、办结率、匹配度、风险评分等百分比字段。
 * 传 value（0-100）与可选 tone；不传 tone 时按数值自动分级。
 */
export function InlineProgress({
  value,
  tone,
  label,
}: {
  value: number;
  tone?: ProgressTone;
  label?: ReactNode;
}) {
  const numeric = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  const resolved: ProgressTone = tone ?? (
    numeric >= 90 ? "success" : numeric >= 70 ? "info" : numeric >= 50 ? "warning" : "danger"
  );
  return (
    <span className="inline-progress" title={`${numeric}%`}>
      <span className="inline-progress-track">
        <span className={`inline-progress-fill inline-progress-fill--${resolved}`} style={{ width: `${numeric}%` }} />
      </span>
      <span className={`inline-progress-value inline-progress-value--${resolved}`}>{label ?? `${numeric}%`}</span>
    </span>
  );
}

/** 核心标签胶囊组：最多展示 max 个，超出折叠为 +N，鼠标悬停展示全部 */
export function TagPills({ tags, max = 2 }: { tags: string[]; max?: number }) {
  const valid = tags.filter(Boolean).slice(0, 12);
  if (!valid.length) return <span className="tag-pills-empty">—</span>;
  const shown = valid.slice(0, max);
  const rest = valid.slice(max);
  return (
    <span className="tag-pills" title={valid.join(" · ")}>
      {shown.map((tag) => <span className="tag-pill" key={tag}>{tag}</span>)}
      {rest.length > 0 && <span className="tag-pill tag-pill--more">+{rest.length}</span>}
    </span>
  );
}
export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  onRowClick,
  openRowDetails = true,
  renderDetails,
  detailTitle = "记录详情",
  pageSizeOptions = [10, 20, 50],
  emptyText = "暂无数据",
  defaultSort,
  className,
  loading = false,
  onResetFilters,
}: {
  columns: DataColumn<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  openRowDetails?: boolean;
  renderDetails?: (row: T) => ReactNode;
  detailTitle?: string;
  pageSizeOptions?: number[];
  emptyText?: string;
  defaultSort?: { key: string; direction: "asc" | "desc" };
  className?: string;
  loading?: boolean;
  onResetFilters?: () => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeOptions[0] ?? 10);
  const [sort, setSort] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(defaultSort ?? null);
  const [selectedRow, setSelectedRow] = useState<T | null>(null);
  const [visible, setVisible] = useState(() =>
    Object.fromEntries(
      columns.map((column) => [column.key, column.defaultVisible !== false]),
    ),
  );
  const sorted = useMemo(() => {
    if (!sort) return data;
    const column = columns.find((item) => item.key === sort.key);
    return [...data].sort(
      (a, b) =>
        String(
          column?.accessor?.(a) ?? a[sort.key as keyof T] ?? "",
        ).localeCompare(
          String(column?.accessor?.(b) ?? b[sort.key as keyof T] ?? ""),
          "zh-CN",
          { numeric: true },
        ) * (sort.direction === "asc" ? 1 : -1),
    );
  }, [columns, data, sort]);
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const rows = sorted.slice((page - 1) * pageSize, page * pageSize);
  const shown = columns.filter(
    (column) => visible[column.key] ?? column.defaultVisible !== false,
  );
  const gridColumnCount = shown.length + (onRowClick ? 1 : 0);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);
  const toggleSort = (column: DataColumn<T>) => {
    if (!column.sortable) return;
    setPage(1);
    setSort((current) =>
      current?.key === column.key
        ? {
            key: column.key,
            direction: current.direction === "asc" ? "desc" : "asc",
          }
        : { key: column.key, direction: "asc" },
    );
  };
  function openDetails(row: T) {
    setSelectedRow(row);
    onRowClick?.(row);
  }

  const details = selectedRow
    ? columns.map((column) => ({
        key: column.key,
        label: column.header,
        value:
          column.accessor?.(selectedRow) ?? selectedRow[column.key as keyof T],
      }))
    : [];

  return (
    <div className={cn("data-table-shell os-glass-card", className)}>
      <div className="data-table-toolbar">
        <span>
          {loading ? "正在加载数据" : data.length ? `共 ${data.length.toLocaleString()} 条` : "数据列表"}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm">
                <Columns3 data-icon="inline-start" />
                列显隐
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            {columns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.key}
                checked={visible[column.key] ?? column.defaultVisible !== false}
                disabled={Boolean(
                  (visible[column.key] ?? column.defaultVisible !== false) &&
                    shown.length === 1,
                )}
                onCheckedChange={(checked) =>
                  setVisible((current) => ({
                    ...current,
                    [column.key]: Boolean(checked),
                  }))
                }
              >
                {column.header}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {shown.map((column) => (
              <TableHead key={column.key} className={column.className}>
                <button
                  type="button"
                  className={cn(
                    "data-table-sort",
                    column.sortable && "is-sortable",
                  )}
                  onClick={() => toggleSort(column)}
                >
                  {column.header}
                  {column.sortable &&
                    (sort?.key === column.key ? (
                      sort.direction === "asc" ? (
                        <ArrowUp />
                      ) : (
                        <ArrowDown />
                      )
                    ) : (
                      <ChevronsUpDown />
                    ))}
                </button>
              </TableHead>
            ))}
            {onRowClick && (
              <TableHead className="data-table-action-head">
                <ChevronRight aria-hidden="true" />
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading
            ? Array.from({ length: Math.min(pageSize, 8) }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {shown.map((column) => (
                    <TableCell key={column.key}>
                      <Skeleton className="h-3.5 w-full max-w-28" />
                    </TableCell>
                  ))}
                  {onRowClick && <TableCell className="data-table-action-cell" />}
                </TableRow>
              ))
            : rows.map((row, index) => (
            <TableRow
              key={String(row.id ?? index)}
              className={cn("data-table-body-row", (onRowClick || openRowDetails) && "data-table-row-clickable")}
              onClick={(event) => {
                if (
                  (event.target as HTMLElement).closest(
                    'button,a,input,[role="button"]',
                  )
                )
                  return;
                if (openRowDetails) openDetails(row);
                else onRowClick?.(row);
              }}
              onKeyDown={(event) => {
                if (
                  (event.target as HTMLElement).closest(
                    'button,a,input,[role="button"]',
                  )
                )
                  return;
                if (
                  (onRowClick || openRowDetails) &&
                  (event.key === "Enter" || event.key === " ")
                ) {
                  event.preventDefault();
                  if (openRowDetails) openDetails(row);
                  else onRowClick?.(row);
                }
              }}
              tabIndex={onRowClick || openRowDetails ? 0 : undefined}
            >
              {shown.map((column) => (
                <TableCell key={column.key} className={column.className}>
                  {column.cell
                    ? column.cell(row)
                    : column.primary || column.subtext
                      ? <span className="data-cell-rich">
                          <strong className="data-cell-rich-main">{String(
                            column.accessor?.(row) ??
                              row[column.key as keyof T] ??
                              "—",
                          )}</strong>
                          {column.subtext && <small className="data-cell-rich-sub">{column.subtext(row)}</small>}
                        </span>
                      : String(
                          column.accessor?.(row) ??
                            row[column.key as keyof T] ??
                            "—",
                        )}
                </TableCell>
              ))}
              {onRowClick && (
                <TableCell className="data-table-action-cell">
                  <ChevronRight aria-hidden="true" />
                </TableCell>
              )}
            </TableRow>
          ))}
          {!loading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={gridColumnCount}>
                <div className="data-table-empty">
                  <Inbox aria-hidden="true" />
                  <strong>{emptyText}</strong>
                  <span>{onResetFilters ? "可重置筛选条件后重新查询" : "调整筛选条件后再试"}</span>
                  {onResetFilters && (
                    <Button type="button" variant="outline" size="sm" onClick={onResetFilters}>
                      <RotateCcw data-icon="inline-start" />
                      重置筛选
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="data-table-pagination">
        <span>每页</span>
        <Select
          value={String(pageSize)}
          onValueChange={(next) => {
            setPageSize(Number(next));
            setPage(1);
          }}
        >
          <SelectTrigger size="sm" aria-label="每页条数" className="data-table-page-size">
            <SelectValue>{(selected) => `${selected} 条`}</SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {pageSizeOptions.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option} 条
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="data-table-page-label">
          第 {page} / {pageCount} 页
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((current) => current - 1)}
        >
          上一页
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => setPage((current) => current + 1)}
        >
          下一页
        </Button>
      </div>
      <Sheet
        open={selectedRow !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedRow(null);
        }}
      >
        <SheetContent side="right" className="data-table-detail-drawer os-glass-card">
          <SheetHeader>
            <SheetTitle>{detailTitle}</SheetTitle>
            <SheetDescription>当前记录的字段信息</SheetDescription>
          </SheetHeader>
          {selectedRow && (
            <div className="data-table-detail-content">
              {renderDetails ? (
                renderDetails(selectedRow)
              ) : (
                <dl>
                  {details.map((detail) => (
                    <div key={detail.key}>
                      <dt>{detail.label}</dt>
                      <dd>{String(detail.value ?? "—")}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
