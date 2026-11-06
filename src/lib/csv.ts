// A cell a spreadsheet would run as a formula gets a leading quote, which Excel shows as plain text.
const FORMULA = /^[=+\-@\t\r]/;

export function csvCell(value: string | number | null) {
  const text = value === null ? "" : FORMULA.test(String(value)) ? `'${value}` : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

// The byte order mark tells Excel the file is UTF-8, so Vietnamese reads right.
export const toCsv = (rows: (string | number | null)[][]) => `﻿${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
