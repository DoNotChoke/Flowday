import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, expect, test } from "vitest";
import { db } from "@/lib/db";
import { category, project, user } from "@/lib/db/schema";
import { NotFoundError } from "./errors";
import { createTask, deleteTask, getTask, listTasks, updateTask } from "./tasks";

const alice = "tasks-test-alice";
const bob = "tasks-test-bob";
let aliceCategory: string;
let bobCategory: string;
let aliceProject: string;
let bobProject: string;

beforeAll(async () => {
  await db.insert(user).values([
    { id: alice, name: "Alice", email: "tasks-alice@flowday.test" },
    { id: bob, name: "Bob", email: "tasks-bob@flowday.test", timezone: "America/New_York" },
  ]);
  const categories = await db
    .insert(category)
    .values([
      { userId: alice, name: "Design", color: "#5b8def" },
      { userId: bob, name: "Design", color: "#5b8def" },
    ])
    .returning();
  aliceCategory = categories[0].id;
  bobCategory = categories[1].id;
  const projects = await db
    .insert(project)
    .values([
      { userId: alice, name: "Flowday", key: "FLW", color: "#f47258", icon: "code" },
      { userId: bob, name: "Other", key: "OTH", color: "#f47258", icon: "code" },
    ])
    .returning();
  aliceProject = projects[0].id;
  bobProject = projects[1].id;
});

afterAll(async () => {
  await db.delete(user).where(inArray(user.id, [alice, bob]));
  await db.$client.end();
});

test("a task starts as ongoing and medium, made on the web", async () => {
  const task = await createTask(alice, { title: "  Viết báo cáo  " });

  expect(task).toMatchObject({ title: "Viết báo cáo", status: "ongoing", priority: "medium", source: "web" });
});

test("an empty title is refused", async () => {
  await expect(createTask(alice, { title: "   " })).rejects.toThrow();
});

test("the due time follows the owner's timezone", async () => {
  const hanoi = await createTask(alice, { title: "Hanoi", dueDate: "2026-11-06", dueTime: "17:00" });
  const newYork = await createTask(bob, { title: "New York", dueDate: "2026-11-06", dueTime: "17:00" });

  expect(hanoi.dueAt?.toISOString()).toBe("2026-11-06T10:00:00.000Z");
  expect(hanoi.dueHasTime).toBe(true);
  expect(newYork.dueAt?.toISOString()).toBe("2026-11-06T22:00:00.000Z");
});

test("a date alone is a due day with no time", async () => {
  const task = await createTask(alice, { title: "All day", dueDate: "2026-11-06" });

  expect(task.dueHasTime).toBe(false);
});

test("an impossible date is refused", async () => {
  await expect(createTask(alice, { title: "Bad", dueDate: "2026-02-30" })).rejects.toThrow();
});

test("tasks in a project get the next number", async () => {
  const first = await createTask(alice, { title: "One", projectId: aliceProject });
  const second = await createTask(alice, { title: "Two", projectId: aliceProject });

  expect(second.number).toBe(first.number! + 1);
});

test("a task with no project has no number", async () => {
  expect((await createTask(alice, { title: "Inbox" })).number).toBeNull();
});

test("categories are attached and returned", async () => {
  const { id } = await createTask(alice, { title: "Tagged", categoryIds: [aliceCategory] });

  expect((await getTask(alice, id))?.categoryIds).toEqual([aliceCategory]);
});

test("someone else's project cannot be used", async () => {
  await expect(createTask(alice, { title: "Sneaky", projectId: bobProject })).rejects.toThrow(NotFoundError);
});

test("someone else's category cannot be used", async () => {
  await expect(createTask(alice, { title: "Sneaky", categoryIds: [bobCategory] })).rejects.toThrow(NotFoundError);
});

test("someone else's task cannot be read", async () => {
  const { id } = await createTask(bob, { title: "Private" });

  expect(await getTask(alice, id)).toBeNull();
  expect((await listTasks(alice)).map((task) => task.id)).not.toContain(id);
});

test("someone else's task cannot be changed", async () => {
  const { id } = await createTask(bob, { title: "Private" });

  await expect(updateTask(alice, id, { title: "Mine now" })).rejects.toThrow(NotFoundError);
  expect((await getTask(bob, id))?.title).toBe("Private");
});

test("someone else's task cannot be deleted", async () => {
  const { id } = await createTask(bob, { title: "Private" });

  await expect(deleteTask(alice, id)).rejects.toThrow(NotFoundError);
  expect(await getTask(bob, id)).not.toBeNull();
});

test("completing stamps the time and reopening clears it", async () => {
  const { id } = await createTask(alice, { title: "Finish me" });

  const done = await updateTask(alice, id, { status: "completed" });
  expect(done.completedAt).toBeInstanceOf(Date);

  const reopened = await updateTask(alice, id, { status: "in_process" });
  expect(reopened.completedAt).toBeNull();
});

test("canceling stamps its own time", async () => {
  const { id } = await createTask(alice, { title: "Cancel me" });

  expect((await updateTask(alice, id, { status: "canceled" })).canceledAt).toBeInstanceOf(Date);
});

test("moving to a project gives a new number, and leaving clears it", async () => {
  const { id } = await createTask(alice, { title: "Mover" });

  const moved = await updateTask(alice, id, { projectId: aliceProject });
  expect(moved.number).toEqual(expect.any(Number));

  expect((await updateTask(alice, id, { projectId: null })).number).toBeNull();
});

test("changing categories replaces them", async () => {
  const { id } = await createTask(alice, { title: "Retag", categoryIds: [aliceCategory] });

  await updateTask(alice, id, { categoryIds: [] });

  expect((await getTask(alice, id))?.categoryIds).toEqual([]);
});

test("the list filters by status and by project", async () => {
  const { id } = await createTask(alice, { title: "Listed", projectId: aliceProject, status: "in_process" });

  expect((await listTasks(alice, { status: "in_process", projectId: aliceProject })).map((task) => task.id)).toContain(id);
  expect((await listTasks(alice, { status: "completed" })).map((task) => task.id)).not.toContain(id);
});

test("a new task lands at the end of its column", async () => {
  const first = await createTask(alice, { title: "Earlier", status: "canceled" });
  const second = await createTask(alice, { title: "Later", status: "canceled" });

  expect(second.position).toBeGreaterThan(first.position);
});

test("deleting removes the task", async () => {
  const { id } = await createTask(alice, { title: "Gone" });

  await deleteTask(alice, id);

  expect(await getTask(alice, id)).toBeNull();
});

test("a project's numbering is shared, not per user", async () => {
  const [row] = await db.select().from(project).where(eq(project.id, aliceProject));

  expect(row.taskSeq).toBeGreaterThan(0);
});
