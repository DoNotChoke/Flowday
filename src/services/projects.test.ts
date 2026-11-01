import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, expect, test } from "vitest";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { projectKey } from "@/lib/projects";
import { NotFoundError, ValidationError } from "./errors";
import { createProject, getProject, listProjects } from "./projects";
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
