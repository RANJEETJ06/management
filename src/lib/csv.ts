// Minimal CSV builder. Emits a UTF-8 BOM so Excel opens non-ASCII
// (₹, ä, Hindi, etc.) without garbling. Quotes any cell containing
// a comma, quote, or newline; doubles embedded quotes per RFC 4180.

export type CsvCell = string | number | boolean | null | undefined | Date;

function escapeCell(value: CsvCell): string {
  if (value == null) return "";
  let s: string;
  if (value instanceof Date) s = value.toISOString();
  else s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) lines.push(row.map(escapeCell).join(","));
  return "﻿" + lines.join("\r\n");
}

export function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function dateStampedName(base: string): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${base}-${y}-${m}-${day}.csv`;
}
