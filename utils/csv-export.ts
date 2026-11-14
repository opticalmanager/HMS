/**
 * CSV Data Exporter Utility
 * Generates and downloads standard UTF-8 CSV files directly in browser with CSV injection protection.
 */

export interface CsvColumn<T = any> {
  header: string;
  accessor: keyof T | ((row: T) => string | number | null | undefined);
}

export function exportToCsv<T>(filename: string, columns: CsvColumn<T>[], rows: T[]): void {
  if (typeof window === "undefined") return;

  const sanitizeCell = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    let str = String(val);

    // Prevent CSV formula injection (=, +, -, @)
    if (/^[=+\-@]/.test(str)) {
      str = `'${str}`;
    }

    // Escape quotes
    return `"${str.replace(/"/g, '""')}"`;
  };

  const headers = columns.map((col) => sanitizeCell(col.header)).join(",");

  const lines = rows.map((row) => {
    return columns
      .map((col) => {
        let val: unknown;
        if (typeof col.accessor === "function") {
          val = col.accessor(row);
        } else {
          val = row[col.accessor];
        }
        return sanitizeCell(val);
      })
      .join(",");
  });

  const csvContent = "\uFEFF" + [headers, ...lines].join("\r\n"); // UTF-8 BOM for Excel compatibility
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename.replace(/\.csv$/, "")}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
