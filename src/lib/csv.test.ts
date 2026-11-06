import { expect, test } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";

test.each([
  ["plain", "plain"],
  ["Viết chương ba", "Viết chương ba"],
  ["a, b", '"a, b"'],
  ['say "hi"', '"say ""hi"""'],
  ["two\nlines", '"two\nlines"'],
  ["=HYPERLINK(\"x\")", '"\'=HYPERLINK(""x"")"'],
  ["+1", "'+1"],
  ["-cmd", "'-cmd"],
  ["@SUM(A1)", "'@SUM(A1)"],
  [25, "25"],
  [null, ""],
])("%j is written as %j", (value, written) => {
  expect(csvCell(value)).toBe(written);
});

test("a file starts with the UTF-8 mark and ends each row with CRLF", () => {
  expect(toCsv([["Title", "Minutes"], ["Đọc", 30]])).toBe("﻿Title,Minutes\r\nĐọc,30\r\n");
});
