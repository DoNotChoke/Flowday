import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, expect, test } from "vitest";
import { db } from "@/lib/db";
import { project, task, user } from "@/lib/db/schema";
import { projectKey } from "@/lib/projects";
import { NotFoundError, ValidationError } from "./errors";
import { archiveProject, createProject, getProject, getProjectOverview, listArchivedProjects, listProjects, restoreProject, updateProject } from "./projects";
import { createTask, listTasks } from "./tasks";

const alice = "projects-test-alice";
const bob = "projects-test-bob";
const base = { color: "#f47258", icon: "code", template: "blank" } as const;

beforeAll(async () => {
  await db.insert(user).values([
    { id: alice, name: "Alice", email: "projects-alice@flowday.test" },
    { id: bob, name: "Bob", email: "projects-bob@flowday.test" },
  ]);
});

afterAll(async () => {
  await db.delete(user).where(inArray(user.id, [alice, bob]));
  await db.$client.end();
});

for (const [name, key] of [
  ["Đồ án tốt nghiệp", "DAT"],
  ["Flowday app", "FA"],
  ["Flowday", "FLO"],
  ["Thesis — Agent Memory", "TAM"],
  ["Ăn uống", "AU"],
  ["  ", "PRJ"],
  ["日本語", "PRJ"],
]) {
  test(`"${name}" gets the prefix ${key}`, () => {
    expect(projectKey(name)).toBe(key);
  });
}

test("a template creates its starter tasks, numbered from 1", async () => {
  const project = await createProject(alice, { ...base, name: "Sprint One", template: "software" });

  const tasks = await listTasks(alice, { projectId: project.id });
  expect(tasks.map((task) => [task.number, task.title])).toEqual([
    [1, "Set up repository & CI"],
    [2, "Design data model"],
    [3, "Build auth flow"],
    [4, "Write release notes"],
  ]);
});

test("the next task continues after the starter tasks", async () => {
  const project = await createProject(alice, { ...base, name: "Numbered", template: "personal" });

  expect((await createTask(alice, { title: "Next", projectId: project.id })).number).toBe(4);
});

test("a repeated prefix gets a number", async () => {
  const first = await createProject(alice, { ...base, name: "Đồ án tốt nghiệp" });
  const second = await createProject(alice, { ...base, name: "Đồ án tập" });

  expect(first.key).toBe("DAT");
  expect(second.key).toBe("DAT2");
});

test("two people can use the same prefix", async () => {
  const mine = await createProject(alice, { ...base, name: "Shared Key Here" });
  const theirs = await createProject(bob, { ...base, name: "Shared Key Here" });

  expect(theirs.key).toBe(mine.key);
});

test("tasks created at the same moment never share a number", async () => {
  const project = await createProject(alice, { ...base, name: "Busy" });

  const tasks = await Promise.all(
    Array.from({ length: 10 }, (_, index) => createTask(alice, { title: `T${index}`, projectId: project.id })),
  );

  expect(new Set(tasks.map((task) => task.number)).size).toBe(10);
});

test("an end date before the start date is refused on that field", async () => {
  const attempt = createProject(alice, { ...base, name: "Backwards", startDate: "2026-12-01", targetDate: "2026-11-01" });

  await expect(attempt).rejects.toMatchObject({ fields: { targetDate: expect.any(Array) } });
  await expect(attempt).rejects.toBeInstanceOf(ValidationError);
});

test("an empty name is refused on that field", async () => {
  await expect(createProject(alice, { ...base, name: "  " })).rejects.toMatchObject({
    fields: { name: expect.any(Array) },
  });
});

test("a color outside the palette is refused", async () => {
  await expect(createProject(alice, { ...base, name: "Odd", color: "red" })).rejects.toBeInstanceOf(ValidationError);
});

test("someone else's project cannot be read", async () => {
  const project = await createProject(bob, { ...base, name: "Private Work" });

  expect(await getProject(alice, project.id)).toBeNull();
  expect((await listProjects(alice)).map((row) => row.id)).not.toContain(project.id);
});

test("the list counts the tasks in each project", async () => {
  const project = await createProject(alice, { ...base, name: "Counted", template: "research" });

  const row = (await listProjects(alice)).find((candidate) => candidate.id === project.id);

  expect(row?.taskCount).toBe(4);
});

test("creating a task in someone else's project stays refused", async () => {
  const project = await createProject(bob, { ...base, name: "Not Yours" });

  await expect(createTask(alice, { title: "Sneaky", projectId: project.id })).rejects.toBeInstanceOf(NotFoundError);
});

const reference = new Date("2026-11-06T10:00:00Z"); // 17:00 on Nov 6 in Ho Chi Minh City

async function overviewProject(key: string, values: { targetDate?: string } = {}) {
  const [row] = await db.insert(project).values({ userId: alice, name: "Overview", key, color: "#f47258", icon: "code", template: "software", ...values }).returning();
  return row;
}

async function addTask(projectId: string, status: "ongoing" | "completed" | "canceled", dueAt: Date | null = null) {
  await db.insert(task).values({ userId: alice, title: "T", projectId, status, dueAt, position: 1 });
}

test("the overview counts done, open and overdue, leaving canceled tasks out", async () => {
  const { id } = await overviewProject("OV1");
  await addTask(id, "completed");
  await addTask(id, "ongoing");
  await addTask(id, "ongoing", new Date("2026-11-01T00:00:00Z"));
  await addTask(id, "canceled", new Date("2026-11-01T00:00:00Z"));

  expect(await getProjectOverview(alice, id, reference)).toMatchObject({ done: 1, total: 3, open: 2, overdue: 1, percent: 33 });
});

test("a task due today is not overdue, and yesterday in the owner's zone is", async () => {
  const { id } = await overviewProject("OV2");
  await addTask(id, "ongoing", new Date("2026-11-06T02:00:00Z")); // 09:00 today, already past
  await addTask(id, "ongoing", new Date("2026-11-05T16:59:00Z")); // 23:59 yesterday there

  expect((await getProjectOverview(alice, id, reference))?.overdue).toBe(1);
  expect((await getProjectOverview(alice, id, new Date("2026-11-05T16:00:00Z")))?.overdue).toBe(0);
});

test("the target date counts days in the owner's zone", async () => {
  const { id } = await overviewProject("OV3", { targetDate: "2026-11-07" });
  const lateEvening = new Date("2026-11-06T16:30:00Z"); // 23:30 on Nov 6 there
  const justAfter = new Date("2026-11-06T17:30:00Z"); // 00:30 on Nov 7 there

  expect(await getProjectOverview(alice, id, lateEvening)).toMatchObject({ targetLabel: "Nov 7", daysLabel: "1 day left" });
  expect((await getProjectOverview(alice, id, justAfter))?.daysLabel).toBe("Due today");
  expect((await getProjectOverview(alice, id, new Date("2026-11-10T03:00:00Z")))?.daysLabel).toBe("3 days overdue");
  expect((await getProjectOverview(alice, id, new Date("2025-11-01T03:00:00Z")))?.targetLabel).toBe("Nov 7, 2026");
});

test("an empty project has no division by zero and no target", async () => {
  const { id } = await overviewProject("OV4");

  expect(await getProjectOverview(alice, id, reference)).toMatchObject({ total: 0, percent: 0, targetLabel: null, daysLabel: null, templateName: "Software sprint" });
});

test("another user's project or a wrong id has no overview", async () => {
  const { id } = await overviewProject("OV5");

  expect(await getProjectOverview(bob, id)).toBeNull();
  expect(await getProjectOverview(alice, "not-a-real-id")).toBeNull();
});

const editable = { name: "Renamed", color: "#5b8def", icon: "book", description: "Goal", startDate: "2026-11-01", targetDate: "2026-12-01", budgetHours: 40 };

test("editing changes the fields and leaves the key and the task codes alone", async () => {
  const created = await createProject(alice, { ...base, name: "Before Edit" });

  const row = await updateProject(alice, created.id, editable);

  expect(row).toMatchObject({ ...editable, key: created.key });
});

test("an edit keeps the same rules as creating", async () => {
  const { id } = await createProject(alice, { ...base, name: "Rules" });

  await expect(updateProject(alice, id, { ...editable, name: "  " })).rejects.toBeInstanceOf(ValidationError);
  await expect(updateProject(alice, id, { ...editable, startDate: "2026-12-02" })).rejects.toBeInstanceOf(ValidationError);
  await expect(updateProject(alice, id, { ...editable, color: "red" })).rejects.toBeInstanceOf(ValidationError);
});

test("an archived project leaves the list but keeps its tasks, and comes back", async () => {
  const { id } = await createProject(alice, { ...base, name: "Archive me" });
  const item = await createTask(alice, { title: "Stays", projectId: id });
  const listed = async () => (await listProjects(alice)).some((row) => row.id === id);

  await archiveProject(alice, id);
  expect(await listed()).toBe(false);
  expect((await getProject(alice, id))?.archivedAt).toBeInstanceOf(Date);
  expect((await listTasks(alice)).find((row) => row.id === item.id)?.projectId).toBe(id);

  await restoreProject(alice, id);
  expect(await listed()).toBe(true);
  expect((await getProject(alice, id))?.archivedAt).toBeNull();
});

test("another user's project can be neither edited nor archived", async () => {
  const { id } = await createProject(alice, { ...base, name: "Mine alone" });

  await expect(updateProject(bob, id, editable)).rejects.toBeInstanceOf(NotFoundError);
  await expect(archiveProject(bob, id)).rejects.toBeInstanceOf(NotFoundError);
  await expect(restoreProject(bob, id)).rejects.toBeInstanceOf(NotFoundError);
  expect(await getProject(alice, id)).toMatchObject({ name: "Mine alone", archivedAt: null });
});

test("the archived list holds only the owner's archived projects", async () => {
  const { id } = await createProject(alice, { ...base, name: "Shelved" });
  await archiveProject(alice, id);

  expect((await listArchivedProjects(alice)).map((row) => row.id)).toContain(id);
  expect(await listArchivedProjects(bob)).toEqual([]);
  await restoreProject(alice, id);
  expect((await listArchivedProjects(alice)).map((row) => row.id)).not.toContain(id);
});
