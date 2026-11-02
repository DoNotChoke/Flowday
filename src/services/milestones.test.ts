import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, expect, test } from "vitest";
import { db } from "@/lib/db";
import { project, task, user } from "@/lib/db/schema";
import { NotFoundError, ValidationError } from "./errors";
import { addMilestone, deleteMilestone, listMilestones, milestoneProgress, updateMilestone } from "./milestones";
import { createTask, getTaskDetail, moveTask, updateTask } from "./tasks";

const alice = "milestones-test-alice";
const bob = "milestones-test-bob";
let mine: string;
let other: string;

beforeAll(async () => {
  await db.insert(user).values([
    { id: alice, name: "Alice", email: "milestones-alice@flowday.test" },
    { id: bob, name: "Bob", email: "milestones-bob@flowday.test" },
  ]);
  const projects = await db
    .insert(project)
    .values([
      { userId: alice, name: "Mine", key: "MIN", color: "#f47258", icon: "code" },
      { userId: alice, name: "Other", key: "OTH", color: "#f47258", icon: "code" },
    ])
    .returning();
  [mine, other] = projects.map((row) => row.id);
});

afterAll(async () => {
  await db.delete(user).where(inArray(user.id, [alice, bob]));
  await db.$client.end();
});

test("milestones list by date, undated last, inside their own project", async () => {
  const late = await addMilestone(alice, other, { name: "  Late ", dueDate: "2026-12-20" });
  const undated = await addMilestone(alice, other, { name: "Someday" });
  const early = await addMilestone(alice, other, { name: "Early", dueDate: "2026-11-15" });
  await addMilestone(alice, mine, { name: "Elsewhere" });

  expect((await listMilestones(alice, other)).map((row) => row.id)).toEqual([early.id, late.id, undated.id]);
  expect((await listMilestones(alice, other)).map((row) => row.name)).toEqual(["Early", "Late", "Someday"]);

  await Promise.all([late, undated, early].map((row) => deleteMilestone(alice, row.id)));
});

test("a milestone can be edited, and its date cleared", async () => {
  const row = await addMilestone(alice, mine, { name: "Before", dueDate: "2026-11-15" });

  expect(await updateMilestone(alice, row.id, { name: "After", dueDate: null })).toMatchObject({ name: "After", dueDate: null });
});

test("a blank name or a wrong date is refused", async () => {
  await expect(addMilestone(alice, mine, { name: "   " })).rejects.toBeInstanceOf(ValidationError);
  await expect(addMilestone(alice, mine, { name: "Bad", dueDate: "soon" })).rejects.toBeInstanceOf(ValidationError);

  const row = await addMilestone(alice, mine, { name: "Kept" });
  await expect(updateMilestone(alice, row.id, { name: "" })).rejects.toBeInstanceOf(ValidationError);
});

test("deleting a milestone keeps its tasks, and the list counts them", async () => {
  const row = await addMilestone(alice, mine, { name: "Counted" });
  const [item] = await db.insert(task).values({ userId: alice, title: "Stays", projectId: mine, milestoneId: row.id, position: 1 }).returning();

  expect((await listMilestones(alice, mine)).find(({ id }) => id === row.id)?.taskCount).toBe(1);

  await deleteMilestone(alice, row.id);

  const [kept] = await db.select().from(task).where(eq(task.id, item.id));
  expect(kept).toMatchObject({ title: "Stays", milestoneId: null, projectId: mine });
});

test("another user's project and milestones are out of reach", async () => {
  const row = await addMilestone(alice, mine, { name: "Private" });

  await expect(addMilestone(bob, mine, { name: "Mine now" })).rejects.toBeInstanceOf(NotFoundError);
  await expect(updateMilestone(bob, row.id, { name: "Taken" })).rejects.toBeInstanceOf(NotFoundError);
  await expect(deleteMilestone(bob, row.id)).rejects.toBeInstanceOf(NotFoundError);
  expect(await listMilestones(bob, mine)).toEqual([]);
  expect((await listMilestones(alice, mine)).find(({ id }) => id === row.id)?.name).toBe("Private");
});

for (const [total, done, started, percent, state] of [
  [0, 0, 0, 0, "Planned"],
  [4, 0, 0, 0, "Planned"],
  [4, 0, 1, 0, "In progress"],
  [4, 1, 0, 25, "In progress"],
  [3, 2, 0, 67, "In progress"],
  [4, 4, 0, 100, "Done"],
] as const) {
  test(`${done}/${total} done and ${started} started is ${percent}% ${state}`, () => {
    expect(milestoneProgress(total, done, started)).toEqual({ percent, state });
  });
}

test("finishing tasks moves the milestone, and canceled tasks do not count", async () => {
  const row = await addMilestone(alice, other, { name: "Progress" });
  const first = await createTask(alice, { title: "First", projectId: other });
  const second = await createTask(alice, { title: "Second", projectId: other });
  const dropped = await createTask(alice, { title: "Dropped", projectId: other });
  await Promise.all([first, second, dropped].map((item) => updateTask(alice, item.id, { milestoneId: row.id })));
  const current = async () => (await listMilestones(alice, other)).find(({ id }) => id === row.id);

  expect(await current()).toMatchObject({ taskCount: 3, percent: 0, state: "Planned" });

  await updateTask(alice, dropped.id, { status: "canceled" });
  await moveTask(alice, first.id, { status: "completed", afterId: null });
  expect(await current()).toMatchObject({ taskCount: 2, percent: 50, state: "In progress" });

  await updateTask(alice, second.id, { status: "completed" });
  expect(await current()).toMatchObject({ percent: 100, state: "Done" });
  await deleteMilestone(alice, row.id);
});

test("a task only joins a milestone of its own project", async () => {
  const foreign = await addMilestone(alice, other, { name: "Other project" });
  const inProject = await createTask(alice, { title: "In project", projectId: mine });
  const inbox = await createTask(alice, { title: "Inbox" });

  await expect(updateTask(alice, inProject.id, { milestoneId: foreign.id })).rejects.toBeInstanceOf(NotFoundError);
  await expect(updateTask(alice, inbox.id, { milestoneId: foreign.id })).rejects.toBeInstanceOf(NotFoundError);
  expect((await getTaskDetail(alice, inProject.id))?.milestoneId).toBeNull();
});

test("someone else's milestone cannot be joined", async () => {
  const theirs = await addMilestone(alice, mine, { name: "Theirs" });
  const [space] = await db.insert(project).values({ userId: bob, name: "Bob", key: "BOB", color: "#f47258", icon: "code" }).returning();
  const row = await createTask(bob, { title: "Bob's", projectId: space.id });

  await expect(updateTask(bob, row.id, { milestoneId: theirs.id })).rejects.toBeInstanceOf(NotFoundError);
});

test("changing project drops the milestone, and clearing it works", async () => {
  const stage = await addMilestone(alice, mine, { name: "Stage" });
  const moved = await createTask(alice, { title: "Moved", projectId: mine });
  const cleared = await createTask(alice, { title: "Cleared", projectId: mine });
  await updateTask(alice, moved.id, { milestoneId: stage.id });
  await updateTask(alice, cleared.id, { milestoneId: stage.id });

  expect((await updateTask(alice, moved.id, { projectId: other })).milestoneId).toBeNull();
  expect((await updateTask(alice, cleared.id, { milestoneId: null })).milestoneId).toBeNull();
});
