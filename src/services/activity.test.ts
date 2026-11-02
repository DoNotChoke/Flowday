import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { db } from "@/lib/db";
import { category, project, task, user } from "@/lib/db/schema";
import { addComment, listActivity, recordActivity } from "./activity";
import { NotFoundError, ValidationError } from "./errors";
import { createProject } from "./projects";
import { addSubtask, deleteSubtask, moveSubtask, renameSubtask, setSubtaskDone } from "./subtasks";
import { createTask, moveTask, updateTask } from "./tasks";

vi.mock("./activity", async (original) => {
  const real = await original<typeof import("./activity")>();
  return { ...real, recordActivity: vi.fn(real.recordActivity) };
});

const alice = "activity-test-alice";
const bob = "activity-test-bob";

beforeAll(async () => {
  await db.insert(user).values([
    { id: alice, name: "Alice", email: "activity-alice@flowday.test" },
    { id: bob, name: "Bob", email: "activity-bob@flowday.test" },
  ]);
});

afterAll(async () => {
  await db.delete(user).where(inArray(user.id, [alice, bob]));
  await db.$client.end();
});

async function log(taskId: string) {
  return (await listActivity(alice, taskId)).map(({ type, payload }) => ({ type, payload }));
}

test("creating a task leaves the first line, by the user unless told otherwise", async () => {
  const mine = await createTask(alice, { title: "Mine" });
  const claude = await createTask(alice, { title: "Claude's" }, "mcp");

  expect(await listActivity(alice, mine.id)).toMatchObject([{ type: "created", actor: "user" }]);
  expect(await listActivity(alice, claude.id)).toMatchObject([{ type: "created", actor: "mcp" }]);
});

test("starter tasks of a project get their first line too", async () => {
  const created = await createProject(alice, { name: "Starter", color: "#f47258", icon: "code", template: "software" });
  const [first] = await db.select({ id: task.id }).from(task).where(eq(task.projectId, created.id));

  expect(await log(first.id)).toMatchObject([{ type: "created" }]);
});

test("each changed field has its own line, newest first", async () => {
  const { id } = await createTask(alice, { title: "Fields" });
  const [tag] = await db.insert(category).values({ userId: alice, name: "Tag", color: "#5b8def" }).returning();
  const [space] = await db.insert(project).values({ userId: alice, name: "Space", key: "SPC", color: "#f47258", icon: "code" }).returning();

  await updateTask(alice, id, { title: "Renamed", priority: "urgent" });
  await updateTask(alice, id, { projectId: space.id });
  await updateTask(alice, id, { categoryIds: [tag.id] });
  await updateTask(alice, id, { dueDate: "2026-11-06" });
  await updateTask(alice, id, { estimateMin: 30 });

  expect((await log(id)).map((row) => (row.payload as { field: string })?.field ?? row.type).toSorted()).toEqual(
    ["categories", "created", "deadline", "estimate", "priority", "project", "title"],
  );
  expect((await log(id))[0]).toEqual({ type: "updated", payload: { field: "estimate" } });
});

test("saving the same values adds nothing", async () => {
  const [tag] = await db.insert(category).values({ userId: alice, name: "Same", color: "#5b8def" }).returning();
  const { id } = await createTask(alice, { title: "Same", priority: "high", categoryIds: [tag.id], dueDate: "2026-11-06", estimateMin: 30 });

  await updateTask(alice, id, { title: "Same", priority: "high", categoryIds: [tag.id], dueDate: "2026-11-06", estimateMin: 30, status: "ongoing" });

  expect(await log(id)).toHaveLength(1);
});

test("a status change records from and to, whether edited or dragged", async () => {
  const { id } = await createTask(alice, { title: "Status" });

  await updateTask(alice, id, { status: "in_process" });
  await moveTask(alice, id, { status: "completed", afterId: null });
  await moveTask(alice, id, { status: "completed", afterId: null });

  expect((await log(id)).slice(0, 2)).toEqual([
    { type: "status", payload: { from: "in_process", to: "completed" } },
    { type: "status", payload: { from: "ongoing", to: "in_process" } },
  ]);
  expect(await log(id)).toHaveLength(3);
});

test("checklist changes are recorded, reordering is not", async () => {
  const { id } = await createTask(alice, { title: "List" });
  const one = await addSubtask(alice, id, "one");
  const two = await addSubtask(alice, id, "two");

  await setSubtaskDone(alice, one.id, true);
  await setSubtaskDone(alice, one.id, false);
  await renameSubtask(alice, one.id, "uno");
  await moveSubtask(alice, two.id, null);
  await deleteSubtask(alice, two.id);

  expect((await log(id)).slice(0, 6).reverse()).toEqual([
    { type: "subtask_added", payload: { title: "one" } },
    { type: "subtask_added", payload: { title: "two" } },
    { type: "subtask_done", payload: { title: "one", done: true } },
    { type: "subtask_done", payload: { title: "one", done: false } },
    { type: "subtask_renamed", payload: { title: "uno" } },
    { type: "subtask_deleted", payload: { title: "two" } },
  ]);
});

test("a failed activity line undoes the change", async () => {
  const { id } = await createTask(alice, { title: "Kept" });
  const item = await addSubtask(alice, id, "kept");
  vi.mocked(recordActivity).mockRejectedValueOnce(new Error("no log"));
  await expect(updateTask(alice, id, { title: "Lost" })).rejects.toThrow("no log");

  vi.mocked(recordActivity).mockRejectedValueOnce(new Error("no log"));
  await expect(moveTask(alice, id, { status: "completed", afterId: null })).rejects.toThrow("no log");

  vi.mocked(recordActivity).mockRejectedValueOnce(new Error("no log"));
  await expect(setSubtaskDone(alice, item.id, true)).rejects.toThrow("no log");

  vi.mocked(recordActivity).mockRejectedValueOnce(new Error("no log"));
  await expect(createTask(alice, { title: "Never" })).rejects.toThrow("no log");

  const [row] = await db.select().from(task).where(eq(task.id, id));
  expect(row).toMatchObject({ title: "Kept", status: "ongoing" });
  expect(await db.select().from(task).where(eq(task.title, "Never"))).toEqual([]);
});

test("a comment is kept as written and a blank one is refused", async () => {
  const { id } = await createTask(alice, { title: "Comment" });

  await addComment(alice, id, "  Xong phần <b>đầu</b> rồi  ");
  await expect(addComment(alice, id, "   ")).rejects.toBeInstanceOf(ValidationError);

  expect((await log(id))[0]).toEqual({ type: "comment", payload: { body: "Xong phần <b>đầu</b> rồi" } });
});

test("another user's task can be neither read nor commented on", async () => {
  const theirs = await createTask(bob, { title: "Theirs" });

  await expect(addComment(alice, theirs.id, "hello")).rejects.toBeInstanceOf(NotFoundError);
  expect(await listActivity(alice, theirs.id)).toEqual([]);
});
