import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { db } from "@/lib/db";
import { zonedToUtc } from "@/lib/datetime";
import { task, user } from "@/lib/db/schema";
import { getCalendar, monthGrid } from "./calendar";
import { createCategory } from "./categories";
import { createTask, getTimeZone, updateTask } from "./tasks";

const alice = "calendar-test-alice";
const bob = "calendar-test-bob";

const days = async (userId: string, from = "2026-11-01", to = "2026-11-30") =>
  Object.fromEntries((await getCalendar(userId, await getTimeZone(userId), from, to)).map((item) => [item.title, item.day]));

beforeAll(async () => {
  await db.insert(user).values([
    { id: alice, name: "Alice", email: "calendar-alice@flowday.test", timezone: "Asia/Ho_Chi_Minh" },
    { id: bob, name: "Bob", email: "calendar-bob@flowday.test", timezone: "America/Los_Angeles" },
  ]);
});

beforeEach(async () => {
  await db.delete(task).where(inArray(task.userId, [alice, bob]));
});

afterAll(async () => {
  await db.delete(user).where(inArray(user.id, [alice, bob]));
  await db.$client.end();
});

test("the grid has 6 weeks and starts on the Monday on or before the 1st", () => {
  expect(monthGrid("2026-11-17")).toHaveLength(42);
  expect(monthGrid("2026-11-17")[0]).toBe("2026-10-26");
  expect(monthGrid("2026-06-30")[0]).toBe("2026-06-01"); // the 1st is a Monday
  expect(monthGrid("2026-03-05")[0]).toBe("2026-02-23"); // the 1st is a Sunday
});

test.each([
  ["Asia/Ho_Chi_Minh", "2026-11-10", "23:30"],
  ["Asia/Ho_Chi_Minh", "2026-11-11", "00:30"],
  ["America/Los_Angeles", "2026-11-10", "23:30"],
  ["America/Los_Angeles", "2026-11-01", "00:30"], // the day clocks go back
])("in %s a task due %s %s stays on that day", async (timezone, dueDate, dueTime) => {
  await db.update(user).set({ timezone }).where(eq(user.id, alice));
  await createTask(alice, { title: "Late", dueDate, dueTime });

  const [item] = (await getCalendar(alice, await getTimeZone(alice), "2026-11-01", "2026-11-30"));
  expect(item).toMatchObject({ day: dueDate, kind: "due", time: dueTime });
});

test("the planned day wins over the due day, and has no time", async () => {
  await db.update(user).set({ timezone: "Asia/Ho_Chi_Minh" }).where(eq(user.id, alice));
  const created = await createTask(alice, { title: "Both", dueDate: "2026-11-20", dueTime: "09:00" });
  await db.update(task).set({ plannedAt: zonedToUtc("2026-11-12", null, "Asia/Ho_Chi_Minh") }).where(eq(task.id, created.id));

  const [item] = (await getCalendar(alice, await getTimeZone(alice), "2026-11-01", "2026-11-30"));
  expect(item).toMatchObject({ day: "2026-11-12", kind: "planned", time: null });
});

test("both ends of the range are included, and undated or canceled tasks are left out", async () => {
  await db.update(user).set({ timezone: "Asia/Ho_Chi_Minh" }).where(eq(user.id, alice));
  await createTask(alice, { title: "First", dueDate: "2026-11-01" });
  await createTask(alice, { title: "Last", dueDate: "2026-11-30", dueTime: "23:59" });
  await createTask(alice, { title: "After", dueDate: "2026-12-01" });
  await createTask(alice, { title: "Undated" });
  const canceled = await createTask(alice, { title: "Canceled", dueDate: "2026-11-05" });
  await updateTask(alice, canceled.id, { status: "canceled" });
  await createTask(alice, { title: "Done", dueDate: "2026-11-06", status: "completed" });

  expect(await days(alice)).toEqual({ First: "2026-11-01", Done: "2026-11-06", Last: "2026-11-30" });
});

test("the colour comes from the first category, else the project, else none", async () => {
  const design = await createCategory(alice, "Aaa calendar");
  await createTask(alice, { title: "Plain", dueDate: "2026-11-02" });
  await createTask(alice, { title: "Tagged", dueDate: "2026-11-03", categoryIds: [design.id] });

  const items = (await getCalendar(alice, await getTimeZone(alice), "2026-11-01", "2026-11-30"));
  expect(items.map(({ category, color }) => ({ category, color }))).toEqual([
    { category: null, color: null },
    { category: "Aaa calendar", color: design.color },
  ]);
});

test("another user's tasks never show", async () => {
  await createTask(bob, { title: "Private", dueDate: "2026-11-10" });

  expect(await days(alice)).toEqual({});
});
