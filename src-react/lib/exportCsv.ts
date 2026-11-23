export type CsvColumn<Row> = {
  header: string;
  value: (row: Row) => unknown;
};

function formatCsvValue(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = Array.isArray(value)
    ? value.join("、")
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  const safe = /^[=+\-@\t\r]/.test(text) && typeof value !== "number" ? "'" + text : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function csvLine(values: unknown[]) {
  return values.map(formatCsvValue).join(",");
}

export function downloadCsv<Row>(
  filename: string,
  columns: CsvColumn<Row>[],
  rows: Row[],
) {
  const lines = [
    columns.map((column) => formatCsvValue(column.header)).join(","),
    ...rows.map((row) =>
      columns.map((column) => formatCsvValue(column.value(row))).join(","),
    ),
  ];
  const file = new Blob([`\uFEFF${lines.join("\r\n")}`], {
    type: "text/csv;charset=utf-8",
  });
  saveBlob(filename, file);
}

export function saveBlob(filename: string, file: Blob) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
