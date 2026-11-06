import { expect, test } from "vitest";
import { burndown } from "@/lib/burndown";

const remaining = (...args: Parameters<typeof burndown>) => burndown(...args).map((point) => point.remaining);

test("finished work comes off the day it is finished", () => {
  const tasks = [
    { estimateMin: 120, created: "2026-11-01", completed: "2026-11-02" },
    { estimateMin: 60, created: "2026-11-01", completed: null },
  ];
  expect(remaining(tasks, "2026-11-01", "2026-11-03", "2026-11-03")).toEqual([3, 1, 1]);
});

test("a task added along the way counts from the day it was added", () => {
  const tasks = [
    { estimateMin: 60, created: "2026-11-01", completed: null },
    { estimateMin: 90, created: "2026-11-03", completed: null },
  ];
  expect(remaining(tasks, "2026-11-01", "2026-11-04", "2026-11-04")).toEqual([1, 1, 2.5, 2.5]);
});

test("tasks without an estimate add nothing", () => {
  const tasks = [
    { estimateMin: null, created: "2026-11-01", completed: null },
    { estimateMin: 30, created: "2026-11-01", completed: null },
  ];
  expect(remaining(tasks, "2026-11-01", "2026-11-01", "2026-11-01")).toEqual([0.5]);
});

test("days after today stay empty so the line stops at today", () => {
  const tasks = [{ estimateMin: 60, created: "2026-11-01", completed: null }];
  expect(burndown(tasks, "2026-11-01", "2026-11-03", "2026-11-02")).toEqual([
    { day: "2026-11-01", remaining: 1 },
    { day: "2026-11-02", remaining: 1 },
    { day: "2026-11-03", remaining: null },
  ]);
});
