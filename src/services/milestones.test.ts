import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, expect, test } from "vitest";
import { db } from "@/lib/db";
import { project, task, user } from "@/lib/db/schema";
import { NotFoundError, ValidationError } from "./errors";
import { addMilestone, deleteMilestone, listMilestones, updateMilestone } from "./milestones";

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
