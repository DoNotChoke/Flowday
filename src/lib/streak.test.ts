import { expect, test } from "vitest";
import { streaks } from "@/lib/streak";

const today = "2026-11-06";

test.each([
  ["no activity at all", [], { current: 0, longest: 0, doneToday: false, lostOn: null }],
  ["only today", ["2026-11-06"], { current: 1, longest: 1, doneToday: true, lostOn: null }],
  ["three days up to today", ["2026-11-04", "2026-11-05", "2026-11-06"], { current: 3, longest: 3, doneToday: true, lostOn: null }],
  ["up to yesterday, nothing yet today", ["2026-11-04", "2026-11-05"], { current: 2, longest: 2, doneToday: false, lostOn: null }],
  ["a gap breaks the chain", ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-05", "2026-11-06"], { current: 2, longest: 3, doneToday: true, lostOn: null }],
  ["last active two days ago", ["2026-11-03", "2026-11-04"], { current: 0, longest: 2, doneToday: false, lostOn: "2026-11-05" }],
])("%s", (_, days, expected) => {
  expect(streaks(days, today)).toEqual(expected);
});

test("a chain runs across the end of a month and of a year", () => {
  expect(streaks(["2026-10-30", "2026-10-31", "2026-11-01"], "2026-11-01").current).toBe(3);
  expect(streaks(["2025-12-31", "2026-01-01"], "2026-01-01").current).toBe(2);
  expect(streaks(["2028-02-28", "2028-02-29", "2028-03-01"], "2028-03-01").current).toBe(3);
});

test("the order and repeats of the days do not matter", () => {
  expect(streaks(["2026-11-06", "2026-11-04", "2026-11-05", "2026-11-05"], today)).toMatchObject({ current: 3, longest: 3 });
});
