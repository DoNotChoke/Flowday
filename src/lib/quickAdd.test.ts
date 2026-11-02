import { expect, test } from "vitest";
import { parseQuickAdd } from "./quickAdd";

const options = {
  categories: ["Design", "Development", "Office Time", "User Experience"],
  now: new Date("2026-11-02T03:00:00Z"), // Monday, 10:00 in Ho Chi Minh City
  timeZone: "Asia/Ho_Chi_Minh",
};

const empty = { dueDate: null, dueTime: null, priority: null, categories: [], unknownCategories: [] };

const cases = [
  ["Review PR tomorrow 9am #Development !high", { title: "Review PR", dueDate: "2026-11-03", dueTime: "09:00", priority: "high", categories: ["Development"] }],
  ["Mua sữa", { title: "Mua sữa" }],
  ["Viết chương ba cho đồ án !urgent", { title: "Viết chương ba cho đồ án", priority: "urgent" }],
  ["Họp nhóm friday at 3pm", { title: "Họp nhóm", dueDate: "2026-11-06", dueTime: "15:00" }],
  ["Nộp báo cáo Nov 20", { title: "Nộp báo cáo", dueDate: "2026-11-20" }],
  ["Call bank tomorrow", { title: "Call bank", dueDate: "2026-11-03" }],
  ["Clean desk #office time", { title: "Clean desk", categories: ["Office Time"] }],
  ["Sketch #design #Development", { title: "Sketch", categories: ["Design", "Development"] }],
  ["Plan #Nope #Design", { title: "Plan", categories: ["Design"], unknownCategories: ["Nope"] }],
  ["Fix !LOW", { title: "Fix", priority: "low" }],
  ["Say hi! to #1 fan", { title: "Say hi! to fan", unknownCategories: ["1"] }],
  ["Hello !maybe", { title: "Hello !maybe" }],
  ["Review May report", { title: "Review May report" }],
  ["tomorrow", { title: "", dueDate: "2026-11-03" }],
] as const;

for (const [text, expected] of cases) {
  test(`parses "${text}"`, () => {
    expect(parseQuickAdd(text, options)).toEqual({ ...empty, ...expected });
  });
}

test("tomorrow is counted from the owner's day, not the machine's", () => {
  // 03:00 on Nov 3 in Ho Chi Minh City, still Nov 2 in UTC and New York.
  const now = new Date("2026-11-02T20:00:00Z");

  expect(parseQuickAdd("Pay tomorrow", { ...options, now }).dueDate).toBe("2026-11-04");
  expect(parseQuickAdd("Pay tomorrow", { ...options, now, timeZone: "America/New_York" }).dueDate).toBe("2026-11-03");
});

test("a past time today moves forward", () => {
  expect(parseQuickAdd("Stand up at 9am", options)).toMatchObject({ title: "Stand up", dueDate: "2026-11-03", dueTime: "09:00" });
});
