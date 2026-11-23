import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Columns3,
  ChevronRight,
  Inbox,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
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
  sortable?: boolean;
  className?: string;
  defaultVisible?: boolean;
};
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
          {data.length ? `共 ${data.length.toLocaleString()} 条` : "数据列表"}
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
          {rows.map((row, index) => (
            <TableRow
              key={String(row.id ?? index)}
              className={cn((onRowClick || openRowDetails) && "data-table-row-clickable")}
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
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={gridColumnCount}>
                <div className="data-table-empty">
                  <Inbox aria-hidden="true" />
                  <strong>{emptyText}</strong>
                  <span>调整筛选条件后再试</span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="data-table-pagination">
        <span>每页</span>
        <select
          value={pageSize}
          onChange={(event) => {
            setPageSize(Number(event.target.value));
            setPage(1);
          }}
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option} 条
            </option>
          ))}
        </select>
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
