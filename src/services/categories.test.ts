import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, expect, test } from "vitest";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { createCategory, deleteCategory, listCategories, renameCategory } from "./categories";
import { NotFoundError, ValidationError } from "./errors";
import { createProject } from "./projects";
import { createTask, getTask, listTasks } from "./tasks";

const alice = "categories-test-alice";
const bob = "categories-test-bob";

beforeAll(async () => {
  await db.insert(user).values([
    { id: alice, name: "Alice", email: "categories-alice@flowday.test" },
    { id: bob, name: "Bob", email: "categories-bob@flowday.test" },
  ]);
});

afterAll(async () => {
  await db.delete(user).where(inArray(user.id, [alice, bob]));
  await db.$client.end();
});

test("a new category gets a color and shows in the list", async () => {
  const created = await createCategory(alice, "  Học tập ");

  expect(created).toMatchObject({ name: "Học tập", color: expect.stringMatching(/^#/) });
  expect((await listCategories(alice)).map((row) => row.name)).toContain("Học tập");
});

test("a duplicate name is refused on that field, ignoring case", async () => {
  await createCategory(alice, "Gym");

  await expect(createCategory(alice, "gym")).rejects.toBeInstanceOf(ValidationError);
});

test("two people can use the same name", async () => {
  await createCategory(alice, "Shared");

  await expect(createCategory(bob, "Shared")).resolves.toMatchObject({ name: "Shared" });
  expect((await listCategories(bob)).map((row) => row.name)).not.toContain("Gym");
});

test("an empty name is refused", async () => {
  await expect(createCategory(alice, "   ")).rejects.toBeInstanceOf(ValidationError);
});

test("a project made from the task form has no starter tasks", async () => {
  const project = await createProject(alice, {
    name: "Quick",
    color: "#f47258",
    icon: "code",
    template: "blank",
    withStarterTasks: false,
  });

  expect(await listTasks(alice, { projectId: project.id })).toEqual([]);
});

test("a category can be renamed, but not onto another one", async () => {
  const first = await createCategory(alice, "Rename me");
  await createCategory(alice, "Taken");

  expect((await renameCategory(alice, first.id, "  Renamed ")).name).toBe("Renamed");
  expect((await renameCategory(alice, first.id, "renamed")).name).toBe("renamed");
  await expect(renameCategory(alice, first.id, "TAKEN")).rejects.toBeInstanceOf(ValidationError);
  await expect(renameCategory(alice, first.id, "  ")).rejects.toBeInstanceOf(ValidationError);
});

test("deleting a category keeps its tasks", async () => {
  const tag = await createCategory(alice, "Short lived");
  const row = await createTask(alice, { title: "Stays", categoryIds: [tag.id] });

  await deleteCategory(alice, tag.id);

  expect((await listCategories(alice)).some(({ id }) => id === tag.id)).toBe(false);
  expect((await getTask(alice, row.id))?.categoryIds).toEqual([]);
});

test("another user's category is out of reach", async () => {
  const mine = await createCategory(alice, "Only mine");

  await expect(renameCategory(bob, mine.id, "Taken over")).rejects.toBeInstanceOf(NotFoundError);
  await expect(deleteCategory(bob, mine.id)).rejects.toBeInstanceOf(NotFoundError);
});
