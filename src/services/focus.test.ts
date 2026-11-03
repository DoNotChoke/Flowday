import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { db } from "@/lib/db";
import { focusSession, task, user } from "@/lib/db/schema";
import { ValidationError } from "./errors";
import { recordSession, trackedSeconds, type FocusSessionInput } from "./focus";
import { createTask, deleteTask } from "./tasks";

const alice = "focus-test-alice";
const bob = "focus-test-bob";
const MINUTE = 60_000;

function session(overrides: Partial<FocusSessionInput> = {}): FocusSessionInput {
  const endedAt = Date.now() - MINUTE;
  return { id: randomUUID(), taskId: null, mode: "focus", startedAt: endedAt - 25 * MINUTE, endedAt, seconds: 25 * 60, completed: true, ...overrides };
}

beforeAll(async () => {
  await db.insert(user).values([
    { id: alice, name: "Alice", email: "focus-alice@flowday.test" },
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
