import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { db } from "@/lib/db";
import { addDays, utcToZoned, zonedToUtc } from "@/lib/datetime";
import { focusSession, task, user } from "@/lib/db/schema";
import { activityDays, completedInRange, focusByCategory, getDailyOverview, getHeatmap, getStreak, getSummary, recentlyCompleted } from "./stats";
import { createCategory } from "./categories";
import { createTask, updateTask } from "./tasks";

const alice = "stats-test-alice";
const bob = "stats-test-bob";
const MINUTE = 60_000;

const setZone = (timezone: string) => db.update(user).set({ timezone }).where(eq(user.id, alice));
const todayIn = (zone: string) => utcToZoned(new Date(), zone).date;

async function finishedAt(userId: string, at: Date) {
  const { id } = await createTask(userId, { title: "Done", status: "completed" });
  await db.update(task).set({ completedAt: at }).where(eq(task.id, id));
}

function focusAt(userId: string, endedAt: Date, overrides: Partial<typeof focusSession.$inferInsert> = {}) {
  return db.insert(focusSession).values({
    id: randomUUID(),
    userId,
    mode: "focus",
    startedAt: new Date(endedAt.getTime() - 25 * MINUTE),
    endedAt,
    seconds: 25 * 60,
    completed: true,
    ...overrides,
  });
}

beforeAll(async () => {
  await db.insert(user).values([
    { id: alice, name: "Alice", email: "stats-alice@flowday.test" },
    { id: bob, name: "Bob", email: "stats-bob@flowday.test" },
  ]);
});

beforeEach(async () => {
  await setZone("Asia/Ho_Chi_Minh");
  await db.delete(focusSession).where(inArray(focusSession.userId, [alice, bob]));
  await db.delete(task).where(inArray(task.userId, [alice, bob]));
});

afterAll(async () => {
  await db.delete(user).where(inArray(user.id, [alice, bob]));
  await db.$client.end();
});

test("tasks finished at 23:30 yesterday and 00:30 today make a two-day streak", async () => {
  const zone = "Asia/Ho_Chi_Minh";
  const today = todayIn(zone);
  await finishedAt(alice, zonedToUtc(addDays(today, -1), "23:30", zone));
  await finishedAt(alice, zonedToUtc(today, "00:30", zone));

  expect(await getStreak(alice)).toMatchObject({ current: 2, longest: 2, doneToday: true, today, days: [addDays(today, -1), today] });
});

test("a zone behind UTC keeps a late task on its own day", async () => {
  const zone = "America/Los_Angeles";
  await setZone(zone);
  const today = todayIn(zone);
  await finishedAt(alice, zonedToUtc(addDays(today, -2), "23:30", zone));

  expect(await getStreak(alice)).toMatchObject({ current: 0, days: [addDays(today, -2)], lostOn: addDays(today, -1) });
});

test("the day clocks go back counts once", async () => {
  await setZone("America/Los_Angeles");
  await finishedAt(alice, new Date("2026-11-01T08:30:00Z")); // 01:30 PDT
  await finishedAt(alice, new Date("2026-11-01T09:30:00Z")); // 01:30 PST, an hour later

  const days = await activityDays(alice, "America/Los_Angeles", "2026-10-31", "2026-11-02");
  expect([...days]).toEqual([["2026-11-01", { tasks: 2, sessions: 0, focusSeconds: 0 }]]);
});

test("changing the time zone moves a task to the owner's new day", async () => {
  await finishedAt(alice, new Date("2026-11-05T20:00:00Z"));
  expect((await getStreak(alice)).days).toEqual(["2026-11-06"]);

  await setZone("America/Los_Angeles");
  expect((await getStreak(alice)).days).toEqual(["2026-11-05"]);
});

test("a finished focus session keeps the streak, a stopped one or a break does not", async () => {
  const zone = "Asia/Ho_Chi_Minh";
  const today = todayIn(zone);
  await focusAt(alice, zonedToUtc(addDays(today, -1), "10:00", zone));
  await focusAt(alice, zonedToUtc(addDays(today, -2), "10:00", zone), { completed: false, seconds: 600 });
  await focusAt(alice, zonedToUtc(addDays(today, -3), "10:00", zone), { mode: "short", seconds: 300 });

  expect(await getStreak(alice)).toMatchObject({ current: 1, doneToday: false, days: [addDays(today, -1)] });
});

test("activity per day adds tasks, finished sessions and every focus second", async () => {
  const zone = "Asia/Ho_Chi_Minh";
  await finishedAt(alice, zonedToUtc("2026-10-30", "09:00", zone));
  await finishedAt(alice, zonedToUtc("2026-10-30", "18:00", zone));
  await focusAt(alice, zonedToUtc("2026-10-30", "11:00", zone));
  await focusAt(alice, zonedToUtc("2026-10-31", "11:00", zone), { completed: false, seconds: 600 });
  await focusAt(alice, zonedToUtc("2026-10-31", "12:00", zone), { mode: "short", seconds: 300 });
  await finishedAt(alice, zonedToUtc("2026-11-01", "09:00", zone)); // outside the range

  const days = await activityDays(alice, zone, "2026-10-30", "2026-10-31");
  expect(Object.fromEntries(days)).toEqual({
    "2026-10-30": { tasks: 2, sessions: 1, focusSeconds: 1500 },
    "2026-10-31": { tasks: 0, sessions: 0, focusSeconds: 600 },
  });
});

test("another user's activity never counts", async () => {
  await finishedAt(bob, new Date());
  await focusAt(bob, new Date(Date.now() - MINUTE));

  expect(await getStreak(alice)).toMatchObject({ current: 0, longest: 0, days: [] });
  expect((await getSummary(alice, "month")).focusSeconds).toBe(0);
});

test("the completion rate counts finished tasks among those created in the range, canceled ones aside", async () => {
  await createTask(alice, { title: "Done", status: "completed" });
  await createTask(alice, { title: "Done too", status: "completed" });
  await createTask(alice, { title: "Open" });
  const dropped = await createTask(alice, { title: "Dropped" });
  await updateTask(alice, dropped.id, { status: "canceled" });
  await focusAt(alice, new Date(Date.now() - MINUTE), { seconds: 3000 });

  expect(await getSummary(alice, "week")).toEqual({ completionRate: 67, completionChange: null, focusSeconds: 3000, focusPerDay: 429 });
});

test("with nothing created the rate is empty rather than zero", async () => {
  expect(await getSummary(alice, "month")).toMatchObject({ completionRate: null, completionChange: null });
});

test("the heatmap runs 53 weeks from a Monday to today, with totals and the busiest weekday", async () => {
  const zone = "Asia/Ho_Chi_Minh";
  const today = todayIn(zone);
  await finishedAt(alice, zonedToUtc(today, "09:00", zone));
  await focusAt(alice, zonedToUtc(addDays(today, -7), "09:00", zone));
  await finishedAt(alice, zonedToUtc(addDays(today, -1), "09:00", zone));
  await finishedAt(alice, zonedToUtc(addDays(today, -400), "09:00", zone)); // before the first week

  const heatmap = await getHeatmap(alice);
  expect(new Date(heatmap.days[0].day).getUTCDay()).toBe(1);
  expect(heatmap.days.at(-1)).toEqual({ day: today, tasks: 1, sessions: 0 });
  expect(heatmap.days.length).toBeGreaterThan(52 * 7);
  expect(heatmap.days.length).toBeLessThanOrEqual(53 * 7);
  expect(heatmap.tasks).toBe(2);
  expect(heatmap.mostActive).toBe(new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(Date.parse(today)));
});

test("an empty year has no busiest day", async () => {
  expect(await getHeatmap(alice)).toMatchObject({ tasks: 0, mostActive: null });
});

test("the overview counts tasks created and finished per day over the range", async () => {
  const zone = "Asia/Ho_Chi_Minh";
  const today = todayIn(zone);
  await createTask(alice, { title: "Made today" });
  await finishedAt(alice, zonedToUtc(addDays(today, -2), "10:00", zone)); // also created today

  const points = await getDailyOverview(alice, "week");
  expect(points).toHaveLength(7);
  expect(points[0].key).toBe(addDays(today, -6));
  expect(points.at(-1)).toEqual({ key: today, created: 2, completed: 0 });
  expect(points.find((point) => point.key === addDays(today, -2))).toEqual({ key: addDays(today, -2), created: 0, completed: 1 });
});

test("over a year the overview runs month by month, ending with this one", async () => {
  await finishedAt(alice, new Date());
  const points = await getDailyOverview(alice, "year");
  expect(points).toHaveLength(12);
  expect(points.at(-1)).toMatchObject({ key: todayIn("Asia/Ho_Chi_Minh").slice(0, 7), created: 1, completed: 1 });
});

test("focus hours go to a task's first category by name, then to Uncategorized", async () => {
  const [zebra, alpha] = [await createCategory(alice, "Zebra stats"), await createCategory(alice, "Alpha stats")];
  const both = await createTask(alice, { title: "Both", categoryIds: [zebra.id, alpha.id] });
  const plain = await createTask(alice, { title: "Plain" });
  const now = Date.now();
  await focusAt(alice, new Date(now - 10 * MINUTE), { taskId: both.id, seconds: 3600 });
  await focusAt(alice, new Date(now - 20 * MINUTE), { taskId: plain.id, seconds: 600 });
  await focusAt(alice, new Date(now - 30 * MINUTE), { seconds: 300 });
  await focusAt(alice, new Date(now - 40 * MINUTE), { taskId: both.id, mode: "short", seconds: 300 });

  expect(await focusByCategory(alice, "month")).toEqual([
    { name: "Alpha stats", color: alpha.color, seconds: 3600 },
    { name: "Uncategorized", color: null, seconds: 900 },
  ]);
});

test("recently completed lists the latest finished tasks first, with their category", async () => {
  const work = await createCategory(alice, "Work stats");
  const { id } = await createTask(alice, { title: "Newest", status: "completed", categoryIds: [work.id] });
  await finishedAt(alice, new Date(Date.now() - 86_400_000));
  await createTask(alice, { title: "Open" });

  const rows = await recentlyCompleted(alice);
  expect(rows.map(({ title, category }) => ({ title, category }))).toEqual([
    { title: "Newest", category: "Work stats" },
    { title: "Done", category: null },
  ]);
  expect(rows[0].id).toBe(id);
});

test("the export lists the tasks finished in the range with their project, categories and focus time", async () => {
  const zone = "Asia/Ho_Chi_Minh";
  const today = todayIn(zone);
  const [beta, alpha] = [await createCategory(alice, "Beta export"), await createCategory(alice, "Alpha export")];
  const { id } = await createTask(alice, { title: "Viết, rồi sửa", status: "completed", estimateMin: 90, categoryIds: [beta.id, alpha.id] });
  await db.update(task).set({ completedAt: zonedToUtc(today, "08:05", zone) }).where(eq(task.id, id));
  await focusAt(alice, new Date(Date.now() - MINUTE), { taskId: id, seconds: 1530 });
  await finishedAt(alice, zonedToUtc(addDays(today, -10), "09:00", zone)); // outside a week

  expect(await completedInRange(alice, "week")).toEqual([
    { completed: `${today} 08:05`, code: "", title: "Viết, rồi sửa", project: "", categories: "Alpha export; Beta export", estimateMin: 90, focusMin: 26 },
  ]);
});
