import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { db } from "@/lib/db";
import { focusSession, task, user } from "@/lib/db/schema";
import { ValidationError } from "./errors";
import { utcToZoned, zonedToUtc } from "@/lib/datetime";
import { addDays } from "./calendar";
import { countFocusToday, getFocusQueue, recordSession, trackedSeconds, type FocusSessionInput } from "./focus";
import { createTask, deleteTask, updateTask } from "./tasks";

const alice = "focus-test-alice";
const bob = "focus-test-bob";
const MINUTE = 60_000;

function session(overrides: Partial<FocusSessionInput> = {}): FocusSessionInput {
  const endedAt = Date.now() - MINUTE;
  return { id: randomUUID(), taskId: null, mode: "focus", startedAt: endedAt - 25 * MINUTE, endedAt, seconds: 25 * 60, completed: true, ...overrides };
}

beforeAll(async () => {
  await db.insert(user).values([
    { id: alice, name: "Alice", email: "focus-alice@flowday.test", timezone: "America/Los_Angeles" },
    { id: bob, name: "Bob", email: "focus-bob@flowday.test" },
  ]);
});

beforeEach(async () => {
  await db.delete(focusSession).where(inArray(focusSession.userId, [alice, bob]));
  await db.delete(task).where(inArray(task.userId, [alice, bob]));
});

afterAll(async () => {
  await db.delete(user).where(inArray(user.id, [alice, bob]));
  await db.$client.end();
});

test("focus time adds up on its task, and breaks do not count", async () => {
  const { id } = await createTask(alice, { title: "Write" });
  await recordSession(alice, session({ taskId: id }));
  await recordSession(alice, session({ taskId: id, seconds: 10 * 60, completed: false }));
  await recordSession(alice, session({ taskId: id, mode: "short", seconds: 5 * 60 }));

  expect(await trackedSeconds(alice, id)).toBe(35 * 60);
});

test("sending the same session twice stores it once", async () => {
  const { id } = await createTask(alice, { title: "Write" });
  const once = session({ taskId: id });
  await recordSession(alice, once);
  await recordSession(alice, once);

  expect(await trackedSeconds(alice, id)).toBe(25 * 60);
});

test.each([
  ["more seconds than the session spanned", { seconds: 26 * 60 }, "seconds"],
  ["more than four hours", { startedAt: Date.now() - 6 * 60 * MINUTE, seconds: 5 * 60 * 60 }, "seconds"],
  ["an end in the future", { endedAt: Date.now() + 10 * MINUTE }, "endedAt"],
  ["an end before the start", { startedAt: Date.now(), endedAt: Date.now() - MINUTE, seconds: 0 }, "endedAt"],
  ["an id the browser did not make", { id: "not-a-uuid" }, "id"],
])("%s is refused", async (_, overrides, field) => {
  const error = await recordSession(alice, session(overrides)).catch((caught) => caught);

  expect(error).toBeInstanceOf(ValidationError);
  expect(Object.keys(error.fields)).toContain(field);
});

test("another user's task cannot take the time", async () => {
  const { id } = await createTask(bob, { title: "Bob's" });

  await expect(recordSession(alice, session({ taskId: id }))).rejects.toThrow("Task not found");
  expect(await trackedSeconds(bob, id)).toBe(0);
});

test("deleting a task keeps its sessions, without the task", async () => {
  const { id } = await createTask(alice, { title: "Gone" });
  const kept = session({ taskId: id });
  await recordSession(alice, kept);
  await deleteTask(alice, id);

  const [row] = await db.select().from(focusSession).where(eq(focusSession.id, kept.id!));
  expect(row).toMatchObject({ taskId: null, seconds: 25 * 60, completed: true });
});

const zone = "America/Los_Angeles";
const today = () => utcToZoned(new Date(), zone).date;

test("the queue holds tasks in process, then those planned or due today, and nothing closed or another day's", async () => {
  await createTask(alice, { title: "Due today", dueDate: today(), dueTime: "23:30", estimateMin: 60 });
  await createTask(alice, { title: "Due tomorrow", dueDate: addDays(today(), 1) });
  await createTask(alice, { title: "Undated" });
  await createTask(alice, { title: "Doing", status: "in_process" });
  await createTask(alice, { title: "Done today", dueDate: today(), status: "completed" });
  const planned = await createTask(alice, { title: "Planned today", estimateMin: 50 });
  await updateTask(alice, planned.id, { plannedDate: today() });
  await createTask(bob, { title: "Bob's", status: "in_process" });

  const queue = await getFocusQueue(alice, zone, 25);
  expect(queue.map((row) => row.title)).toEqual(["Doing", "Planned today", "Due today"]);
  expect(queue.map((row) => row.planned)).toEqual([null, 2, 3]);
});

test("each queued task counts its finished focus sessions", async () => {
  const { id } = await createTask(alice, { title: "Doing", status: "in_process", estimateMin: 100 });
  await recordSession(alice, session({ taskId: id }));
  await recordSession(alice, session({ taskId: id }));
  await recordSession(alice, session({ taskId: id, completed: false, seconds: 120 }));

  expect(await getFocusQueue(alice, zone, 50)).toMatchObject([{ title: "Doing", done: 2, planned: 2 }]);
});

test("today's count follows the owner's midnight and only counts finished focus", async () => {
  const midnight = zonedToUtc(today(), null, zone).getTime();
  await recordSession(alice, session({ startedAt: midnight - 26 * MINUTE, endedAt: midnight - MINUTE }));
  await recordSession(alice, session({ startedAt: midnight - 20 * MINUTE, endedAt: midnight + 5_000, seconds: 20 * 60 }));
  await recordSession(alice, session({ completed: false, seconds: 120 }));
  await recordSession(alice, session({ mode: "short", seconds: 5 * 60 }));

  expect(await countFocusToday(alice, zone)).toBe(1);
});
