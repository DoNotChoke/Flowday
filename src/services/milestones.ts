import { and, asc, count, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { milestone, project, task } from "@/lib/db/schema";
import { NotFoundError, parseInput } from "./errors";

const fields = z.object({
  name: z.string().trim().min(1, "Enter a milestone name.").max(80),
  dueDate: z.iso.date().nullable().optional(),
});

export type MilestoneInput = z.input<typeof fields>;

async function ownedMilestone(userId: string, id: string) {
  const [row] = await db
    .select({ id: milestone.id })
    .from(milestone)
    .innerJoin(project, eq(milestone.projectId, project.id))
    .where(and(eq(milestone.id, id), eq(project.userId, userId)));
  if (!row) throw new NotFoundError("Milestone");
}

export function listMilestones(userId: string, projectId: string) {
  return db
    .select({ id: milestone.id, name: milestone.name, dueDate: milestone.dueDate, taskCount: count(task.id) })
    .from(milestone)
    .innerJoin(project, eq(milestone.projectId, project.id))
    .leftJoin(task, eq(task.milestoneId, milestone.id))
    .where(and(eq(milestone.projectId, projectId), eq(project.userId, userId)))
    .groupBy(milestone.id)
    .orderBy(sql`${milestone.dueDate} asc nulls last`, asc(milestone.createdAt));
}

export async function addMilestone(userId: string, projectId: string, input: MilestoneInput) {
  const values = parseInput(fields, input);
  const [owned] = await db
    .select({ id: project.id })
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.userId, userId)));
  if (!owned) throw new NotFoundError("Project");

  const [row] = await db
    .insert(milestone)
    .values({ ...values, projectId })
    .returning();
  return row;
}

export async function updateMilestone(userId: string, id: string, input: MilestoneInput) {
  const values = parseInput(fields, input);
  await ownedMilestone(userId, id);

  const [row] = await db.update(milestone).set(values).where(eq(milestone.id, id)).returning();
  return row;
}

export async function deleteMilestone(userId: string, id: string) {
  await ownedMilestone(userId, id);
  await db.delete(milestone).where(eq(milestone.id, id));
}
