import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { db } from "@/lib/db";
import { utcToZoned, zonedToUtc } from "@/lib/datetime";
import { category, subtask, task, user } from "@/lib/db/schema";
import { percentDone } from "@/lib/progress";
import { getBoard } from "./board";
import { createProject } from "./projects";
import { createTask } from "./tasks";

const alice = "board-test-alice";
const bob = "board-test-bob";
const zone = "Asia/Ho_Chi_Minh";

const today = () => utcToZoned(new Date(), zone).date;
const shift = (date: string, days: number) => new Date(Date.parse(date) + days * 86_400_000).toISOString().slice(0, 10);
const titles = (board: Awaited<ReturnType<typeof getBoard>>) => board.tasks.map((row) => row.title);

beforeAll(async () => {
  await db.insert(user).values([
    { id: alice, name: "Nguyễn Việt", email: "board-alice@flowday.test" },
    { id: bob, name: "Bob", email: "board-bob@flowday.test" },
  ]);
});

beforeEach(async () => {
  await db.delete(task).where(inArray(task.userId, [alice, bob]));
});

afterAll(async () => {
  await db.delete(user).where(inArray(user.id, [alice, bob]));
  await db.$client.end();
});

test("the greeting uses the owner's name and today's date in their timezone", async () => {
  const board = await getBoard(alice);

  expect(board.name).toBe("Nguyễn Việt");
  expect(board.dateLabel).toBe(
    new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: zone }).format(new Date()).replace(" ", " "),
  );
});

test("only the owner's tasks are on the board", async () => {
  await createTask(bob, { title: "Private" });

  expect(titles(await getBoard(alice))).not.toContain("Private");
});

test("counts follow the status of every task", async () => {
  await createTask(alice, { title: "A" });
  await createTask(alice, { title: "B", status: "in_process" });
  await createTask(alice, { title: "C", status: "completed" });
  await createTask(alice, { title: "D", status: "canceled" });

  const { stats } = await getBoard(alice);

  expect(stats).toMatchObject({
    ongoing: { count: 1 },
    in_process: { count: 1 },
    completed: { count: 1 },
    canceled: { count: 1 },
  });
});

test("the completed delta only counts the last 7 days", async () => {
  const { id } = await createTask(alice, { title: "Old", status: "completed" });
  await db.update(task).set({ completedAt: new Date(Date.now() - 8 * 86_400_000) }).where(eq(task.id, id));
  await createTask(alice, { title: "Recent", status: "completed" });

  expect((await getBoard(alice)).stats.completed.delta).toBe("+1 wk");
});

test("the ongoing delta counts tasks added in the last 7 days", async () => {
  const { id } = await createTask(alice, { title: "Old" });
  await db.update(task).set({ createdAt: new Date(Date.now() - 8 * 86_400_000) }).where(eq(task.id, id));
  await createTask(alice, { title: "New" });

  expect((await getBoard(alice)).stats.ongoing.delta).toBe("+1");
});

test("due today counts open tasks inside the owner's day, not the UTC day", async () => {
  await createTask(alice, { title: "Start", dueDate: today(), dueTime: "00:01" });
  await createTask(alice, { title: "End", dueDate: today(), dueTime: "23:59" });
  await createTask(alice, { title: "Tomorrow", dueDate: shift(today(), 1), dueTime: "00:01" });
  await createTask(alice, { title: "Yesterday", dueDate: shift(today(), -1), dueTime: "23:59" });
  await createTask(alice, { title: "Done", dueDate: today(), status: "completed" });

  expect((await getBoard(alice)).dueToday).toBe(2);
});

test("in process shows how many are due today", async () => {
  await createTask(alice, { title: "Now", dueDate: today(), status: "in_process" });
  await createTask(alice, { title: "Later", status: "in_process" });

  expect((await getBoard(alice)).stats.in_process.delta).toBe("1 today");
});

test("a card says Today or the short date", async () => {
  await createTask(alice, { title: "Now", dueDate: today() });
  await createTask(alice, { title: "Fixed", dueDate: "2027-03-05" });
  await createTask(alice, { title: "Never" });

  const board = await getBoard(alice);
  const label = (title: string) => board.tasks.find((row) => row.title === title)?.dueLabel;

  expect(label("Now")).toBe("Today");
  expect(label("Fixed")).toBe("Mar 5");
  expect(label("Never")).toBeNull();
});

test("a card is overdue only after its day ended, and never once closed", async () => {
  const yesterday = shift(today(), -1);
  await createTask(alice, { title: "Late", dueDate: yesterday, dueTime: "23:59", estimateMin: 90 });
  await createTask(alice, { title: "Today", dueDate: today(), dueTime: "00:01" });
  await createTask(alice, { title: "Done", dueDate: yesterday, status: "completed" });
  await createTask(alice, { title: "Dropped", dueDate: yesterday, status: "canceled" });

  const { tasks } = await getBoard(alice);
  expect(Object.fromEntries(tasks.map((card) => [card.title, card.overdue]))).toEqual({ Late: true, Today: false, Done: false, Dropped: false });
  expect(tasks.find((card) => card.title === "Late")?.estimateMin).toBe(90);
});

test("a card shows its project, categories and checklist", async () => {
  const project = await createProject(alice, { name: "Đồ án", color: "#f47258", icon: "code", template: "blank", withStarterTasks: false });
  const [tag] = await db.insert(category).values({ userId: alice, name: "Tag", color: "#5b8def" }).returning();
  const { id } = await createTask(alice, { title: "Full", projectId: project.id, categoryIds: [tag.id] });
  await db.insert(subtask).values([
    { taskId: id, title: "One", done: true, position: 1 },
    { taskId: id, title: "Two", done: false, position: 2 },
  ]);

  const [card] = (await getBoard(alice)).tasks;

  expect(card).toMatchObject({ projectName: "Đồ án", code: `${project.key}-1`, categories: ["Tag"], subtasksDone: 1, subtasksTotal: 2 });
  await db.delete(category).where(eq(category.id, tag.id));
});

test("filters by category and by project", async () => {
  const project = await createProject(alice, { name: "Filter", color: "#f47258", icon: "code", template: "blank", withStarterTasks: false });
  const [tag] = await db.insert(category).values({ userId: alice, name: "Filtered", color: "#5b8def" }).returning();
  await createTask(alice, { title: "Tagged", categoryIds: [tag.id] });
  await createTask(alice, { title: "In project", projectId: project.id });
  await createTask(alice, { title: "Neither" });

  expect(titles(await getBoard(alice, { categoryId: tag.id }))).toEqual(["Tagged"]);
  expect(titles(await getBoard(alice, { projectId: project.id }))).toEqual(["In project"]);
  await db.delete(category).where(eq(category.id, tag.id));
});

test("a filter does not change the summary cards", async () => {
  await createTask(alice, { title: "A" });

  expect((await getBoard(alice, { categoryId: "none" })).stats.ongoing.count).toBe(1);
});

test("sorts manually, by priority, or by due date with undated tasks last", async () => {
  await createTask(alice, { title: "Low", priority: "low", dueDate: "2027-03-01" });
  await createTask(alice, { title: "Urgent", priority: "urgent" });
  await createTask(alice, { title: "Medium", dueDate: "2027-02-01" });

  expect(titles(await getBoard(alice))).toEqual(["Low", "Urgent", "Medium"]);
  expect(titles(await getBoard(alice, { sort: "priority" }))).toEqual(["Urgent", "Medium", "Low"]);
  expect(titles(await getBoard(alice, { sort: "due" }))).toEqual(["Medium", "Low", "Urgent"]);
});

for (const [status, done, total, percent] of [
  ["ongoing", 1, 4, 25],
  ["ongoing", 2, 3, 67],
  ["completed", 0, 0, 100],
  ["ongoing", 0, 0, 0],
  ["canceled", 0, 0, 0],
] as const) {
  test(`${done}/${total} subtasks in ${status} shows ${percent}%`, () => {
    expect(percentDone(status, done, total)).toBe(percent);
  });
}

test("a day boundary in another timezone stays correct", () => {
  expect(zonedToUtc("2026-11-06", null, zone).toISOString()).toBe("2026-11-05T17:00:00.000Z");
});
