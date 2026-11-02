import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, expect, test } from "vitest";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { getBoard } from "./board";
import { NotFoundError, ValidationError } from "./errors";
import { addSubtask, deleteSubtask, listSubtasks, moveSubtask, renameSubtask, setSubtaskDone } from "./subtasks";
import { createTask } from "./tasks";

const alice = "subtasks-test-alice";
const bob = "subtasks-test-bob";

beforeAll(async () => {
  await db.insert(user).values([
    { id: alice, name: "Alice", email: "subtasks-alice@flowday.test" },
    { id: bob, name: "Bob", email: "subtasks-bob@flowday.test" },
  ]);
});

afterAll(async () => {
  await db.delete(user).where(inArray(user.id, [alice, bob]));
  await db.$client.end();
});

async function titles(taskId: string) {
  return (await listSubtasks(alice, taskId)).map((row) => row.title);
}

test("items are added in order and the title is trimmed", async () => {
  const { id } = await createTask(alice, { title: "Order" });

  await addSubtask(alice, id, "  first ");
  await addSubtask(alice, id, "second");

  expect(await titles(id)).toEqual(["first", "second"]);
});

test("a blank title is refused", async () => {
  const { id } = await createTask(alice, { title: "Blank" });

  await expect(addSubtask(alice, id, "   ")).rejects.toBeInstanceOf(ValidationError);
  const row = await addSubtask(alice, id, "kept");
  await expect(renameSubtask(alice, row.id, "")).rejects.toBeInstanceOf(ValidationError);
  expect(await titles(id)).toEqual(["kept"]);
});

test("ticking drives the percentage on the board", async () => {
  const task = await createTask(alice, { title: "Percent" });
  const first = await addSubtask(alice, task.id, "one");
  await addSubtask(alice, task.id, "two");

  await setSubtaskDone(alice, first.id, true);

  const { tasks } = await getBoard(alice);
  expect(tasks.find((card) => card.id === task.id)).toMatchObject({ subtasksDone: 1, subtasksTotal: 2 });

  await setSubtaskDone(alice, first.id, false);
  expect((await listSubtasks(alice, task.id))[0].done).toBe(false);
});

test("an item can be renamed, moved and deleted", async () => {
  const { id } = await createTask(alice, { title: "Edit" });
  const a = await addSubtask(alice, id, "a");
  const b = await addSubtask(alice, id, "b");
  const c = await addSubtask(alice, id, "c");

  await renameSubtask(alice, b.id, "bee");
  await moveSubtask(alice, c.id, null);
  await moveSubtask(alice, a.id, b.id);
  expect(await titles(id)).toEqual(["c", "bee", "a"]);

  await deleteSubtask(alice, b.id);
  expect(await titles(id)).toEqual(["c", "a"]);
});

test("another user's task and items are out of reach", async () => {
  const theirs = await createTask(bob, { title: "Theirs" });
  const item = await addSubtask(bob, theirs.id, "private");

  await expect(addSubtask(alice, theirs.id, "mine")).rejects.toBeInstanceOf(NotFoundError);
  await expect(setSubtaskDone(alice, item.id, true)).rejects.toBeInstanceOf(NotFoundError);
  await expect(renameSubtask(alice, item.id, "taken")).rejects.toBeInstanceOf(NotFoundError);
  await expect(moveSubtask(alice, item.id, null)).rejects.toBeInstanceOf(NotFoundError);
  await expect(deleteSubtask(alice, item.id)).rejects.toBeInstanceOf(NotFoundError);

  expect(await listSubtasks(alice, theirs.id)).toEqual([]);
  expect(await listSubtasks(bob, theirs.id)).toMatchObject([{ title: "private", done: false }]);
});
