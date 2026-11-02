import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, expect, test } from "vitest";
import { db } from "@/lib/db";
import { category, project, user } from "@/lib/db/schema";
import { NotFoundError, ValidationError } from "./errors";
import { createTask, deleteTask, getTask, getTaskDetail, listTasks, moveTask, searchTasks, updateTask } from "./tasks";

const alice = "tasks-test-alice";
const bob = "tasks-test-bob";
const mover = "tasks-test-mover";
let aliceCategory: string;
let bobCategory: string;
let aliceProject: string;
let bobProject: string;

beforeAll(async () => {
  await db.insert(user).values([
    { id: alice, name: "Alice", email: "tasks-alice@flowday.test" },
    { id: bob, name: "Bob", email: "tasks-bob@flowday.test", timezone: "America/New_York" },
    { id: mover, name: "Mover", email: "tasks-mover@flowday.test" },
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
  await db.delete(user).where(inArray(user.id, [alice, bob, mover]));
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

async function column(userId: string, status: "in_process" | "completed") {
  return (await listTasks(userId, { status })).map((row) => row.title);
}

test("a task moves between two cards, to the top and to the end of a column", async () => {
  const first = await createTask(mover, { title: "first", status: "in_process" });
  const last = await createTask(mover, { title: "last", status: "in_process" });
  const middle = await createTask(mover, { title: "middle" });
  const top = await createTask(mover, { title: "top" });
  const end = await createTask(mover, { title: "end" });

  await moveTask(mover, middle.id, { status: "in_process", afterId: first.id });
  await moveTask(mover, top.id, { status: "in_process", afterId: null });
  await moveTask(mover, end.id, { status: "in_process", afterId: last.id });

  expect(await column(mover, "in_process")).toEqual(["top", "first", "middle", "last", "end"]);
  await Promise.all([first, last, middle, top, end].map((row) => deleteTask(mover, row.id)));
});

test("a task reorders inside its own column", async () => {
  const a = await createTask(mover, { title: "a", status: "in_process" });
  const b = await createTask(mover, { title: "b", status: "in_process" });
  const c = await createTask(mover, { title: "c", status: "in_process" });

  await moveTask(mover, a.id, { status: "in_process", afterId: b.id });

  expect(await column(mover, "in_process")).toEqual(["b", "a", "c"]);
  await Promise.all([a, b, c].map((row) => deleteTask(mover, row.id)));
});

test("moving into an empty column works, and completing stamps the time only when the status changes", async () => {
  const moved = await createTask(mover, { title: "done" });

  const completed = await moveTask(mover, moved.id, { status: "completed", afterId: null });
  expect(completed.completedAt).toBeInstanceOf(Date);

  const again = await moveTask(mover, moved.id, { status: "completed", afterId: null });
  expect(again.completedAt).toEqual(completed.completedAt);

  const reopened = await moveTask(mover, moved.id, { status: "ongoing", afterId: null });
  expect(reopened.completedAt).toBeNull();
  await deleteTask(mover, moved.id);
});

test("a neighbour that left the column puts the task at the end", async () => {
  const stays = await createTask(mover, { title: "stays", status: "in_process" });
  const gone = await createTask(mover, { title: "gone" });
  const moved = await createTask(mover, { title: "moved" });

  await moveTask(mover, moved.id, { status: "in_process", afterId: gone.id });

  expect(await column(mover, "in_process")).toEqual(["stays", "moved"]);
  await Promise.all([stays, gone, moved].map((row) => deleteTask(mover, row.id)));
});

test("another user's task cannot be moved, and their cards do not place yours", async () => {
  const mine = await createTask(mover, { title: "mine", status: "in_process" });
  const theirs = await createTask(bob, { title: "theirs", status: "in_process" });

  await expect(moveTask(mover, theirs.id, { status: "completed", afterId: null })).rejects.toBeInstanceOf(NotFoundError);
  expect((await getTask(bob, theirs.id))?.status).toBe("in_process");

  const moved = await createTask(mover, { title: "moved" });
  await moveTask(mover, moved.id, { status: "in_process", afterId: theirs.id });
  expect(await column(mover, "in_process")).toEqual(["mine", "moved"]);
  await Promise.all([deleteTask(mover, mine.id), deleteTask(mover, moved.id), deleteTask(bob, theirs.id)]);
});

test("a status outside the list is refused", async () => {
  const row = await createTask(mover, { title: "row" });

  await expect(moveTask(mover, row.id, { status: "archived" as "ongoing", afterId: null })).rejects.toBeInstanceOf(ValidationError);
  await deleteTask(mover, row.id);
});

test("the detail gives the due date in the owner's zone, the code and the project", async () => {
  const row = await createTask(alice, { title: "Detail", projectId: aliceProject, dueDate: "2026-11-06", dueTime: "17:00" });
  const detail = await getTaskDetail(alice, row.id);

  expect(detail).toMatchObject({ dueDate: "2026-11-06", dueTime: "17:00", dueLabel: "Fri, Nov 6, 17:00", projectName: "Flowday" });
  expect(detail?.code).toBe(`FLW-${row.number}`);
  await deleteTask(alice, row.id);
});

test("an all-day task has no time, and no due date gives empty values", async () => {
  const allDay = await createTask(alice, { title: "All day", dueDate: "2026-11-06" });
  const none = await createTask(alice, { title: "None" });

  expect(await getTaskDetail(alice, allDay.id)).toMatchObject({ dueDate: "2026-11-06", dueTime: "", dueLabel: "Fri, Nov 6", code: null });
  expect(await getTaskDetail(alice, none.id)).toMatchObject({ dueDate: "", dueTime: "", dueLabel: null });
  await Promise.all([deleteTask(alice, allDay.id), deleteTask(alice, none.id)]);
});

test("another user's task or a wrong id has no detail", async () => {
  const theirs = await createTask(bob, { title: "Theirs" });

  expect(await getTaskDetail(alice, theirs.id)).toBeNull();
  expect(await getTaskDetail(alice, "not-a-real-id")).toBeNull();
  await deleteTask(bob, theirs.id);
});

test("restoring a canceled task clears the cancel time", async () => {
  const row = await createTask(alice, { title: "Back", status: "canceled" });

  expect((await updateTask(alice, row.id, { status: "ongoing" })).canceledAt).toBeNull();
  await deleteTask(alice, row.id);
});

test("a deleted task is gone", async () => {
  const row = await createTask(alice, { title: "Gone" });

  await deleteTask(alice, row.id);

  expect(await getTask(alice, row.id)).toBeNull();
});

test("search ignores accents and case in the title and the description", async () => {
  const title = await createTask(mover, { title: "Đồ án tốt nghiệp" });
  const description = await createTask(mover, { title: "Khác", description: "Phần thực nghiệm" });

  expect((await searchTasks(mover, "do an")).map((row) => row.id)).toEqual([title.id]);
  expect((await searchTasks(mover, "THUC NGHIEM")).map((row) => row.id)).toEqual([description.id]);
  expect(await searchTasks(mover, "Đồ Án")).toHaveLength(1);
  await Promise.all([deleteTask(mover, title.id), deleteTask(mover, description.id)]);
});

test("search treats % _ and backslash as plain characters", async () => {
  const percent = await createTask(mover, { title: "Giảm 50% giá" });
  const under = await createTask(mover, { title: "snake_case" });
  const slash = await createTask(mover, { title: "C:\temp" });
  const plain = await createTask(mover, { title: "snakeXcase" });

  expect((await searchTasks(mover, "%")).map((row) => row.id)).toEqual([percent.id]);
  expect((await searchTasks(mover, "_")).map((row) => row.id)).toEqual([under.id]);
  expect((await searchTasks(mover, "\\")).map((row) => row.id)).toEqual([slash.id]);
  await Promise.all([percent, under, slash, plain].map((row) => deleteTask(mover, row.id)));
});

test("search stays inside the user, gives the code, and ignores a blank query", async () => {
  const theirs = await createTask(bob, { title: "Bí mật riêng" });
  const mine = await createTask(alice, { title: "Tìm thấy", projectId: aliceProject });

  expect(await searchTasks(mover, "bi mat")).toEqual([]);
  expect(await searchTasks(alice, "tim thay")).toMatchObject([{ id: mine.id, code: `FLW-${mine.number}`, status: "ongoing" }]);
  expect(await searchTasks(alice, "   ")).toEqual([]);
  await Promise.all([deleteTask(bob, theirs.id), deleteTask(alice, mine.id)]);
});

test("search returns at most 20 tasks", async () => {
  const rows = await Promise.all(Array.from({ length: 21 }, (_, index) => createTask(mover, { title: `Nhiều ${index}` })));

  expect(await searchTasks(mover, "nhieu")).toHaveLength(20);
  await Promise.all(rows.map((row) => deleteTask(mover, row.id)));
});
