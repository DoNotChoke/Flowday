import { and, asc, eq, inArray, max, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { category, project, task, taskCategory, taskPriority, taskStatus, user } from "@/lib/db/schema";
import { zonedToUtc } from "@/lib/datetime";
import { NotFoundError, parseInput } from "./errors";

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type TaskRow = typeof task.$inferSelect;

export const POSITION_GAP = 1024;

const fields = {
  title: z.string().trim().min(1, "Enter a task name.").max(200),
  description: z.string().max(10_000).nullable().optional(),
  status: z.enum(taskStatus.enumValues),
  priority: z.enum(taskPriority.enumValues),
  projectId: z.string().nullable().optional(),
  categoryIds: z.array(z.string()).max(20),
  dueDate: z.iso.date().nullable().optional(),
  dueTime: z.iso.time({ precision: -1 }).nullable().optional(),
  estimateMin: z.number().int().min(0).max(100_000).nullable().optional(),
  alertEnabled: z.boolean(),
};

const createSchema = z.object({
  ...fields,
  status: fields.status.default("ongoing"),
  priority: fields.priority.default("medium"),
  categoryIds: fields.categoryIds.default([]),
  alertEnabled: fields.alertEnabled.default(false),
});
const updateSchema = z.object(fields).partial();

export type CreateTaskInput = z.input<typeof createSchema>;
export type UpdateTaskInput = z.input<typeof updateSchema>;

function statusStamps(status: TaskRow["status"]) {
  return {
    completedAt: status === "completed" ? new Date() : null,
    canceledAt: status === "canceled" ? new Date() : null,
  };
}

async function dueFields(tx: Transaction, userId: string, dueDate?: string | null, dueTime?: string | null) {
  if (!dueDate) return { dueAt: null, dueHasTime: false };
  const [{ timezone }] = await tx.select({ timezone: user.timezone }).from(user).where(eq(user.id, userId));
  return { dueAt: zonedToUtc(dueDate, dueTime ?? null, timezone ?? "UTC"), dueHasTime: Boolean(dueTime) };
}

async function nextNumber(tx: Transaction, userId: string, projectId: string) {
  const [row] = await tx
    .update(project)
    .set({ taskSeq: sql`${project.taskSeq} + 1` })
    .where(and(eq(project.id, projectId), eq(project.userId, userId)))
    .returning({ number: project.taskSeq });
  if (!row) throw new NotFoundError("Project");
  return row.number;
}

export async function endOfColumn(tx: Transaction, userId: string, status: TaskRow["status"]) {
  const [row] = await tx
    .select({ last: max(task.position) })
    .from(task)
    .where(and(eq(task.userId, userId), eq(task.status, status)));
  return (row.last ?? 0) + POSITION_GAP;
}

async function setCategories(tx: Transaction, userId: string, taskId: string, categoryIds: string[]) {
  const ids = [...new Set(categoryIds)];
  if (ids.length > 0) {
    const owned = await tx
      .select({ id: category.id })
      .from(category)
      .where(and(eq(category.userId, userId), inArray(category.id, ids)));
    if (owned.length !== ids.length) throw new NotFoundError("Category");
  }
  await tx.delete(taskCategory).where(eq(taskCategory.taskId, taskId));
  if (ids.length > 0) await tx.insert(taskCategory).values(ids.map((categoryId) => ({ taskId, categoryId })));
}

export async function createTask(userId: string, input: CreateTaskInput) {
  const { categoryIds, dueDate, dueTime, ...values } = parseInput(createSchema, input);

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(task)
      .values({
        ...values,
        userId,
        number: values.projectId ? await nextNumber(tx, userId, values.projectId) : null,
        position: await endOfColumn(tx, userId, values.status),
        ...(await dueFields(tx, userId, dueDate, dueTime)),
        ...statusStamps(values.status),
      })
      .returning();
    await setCategories(tx, userId, row.id, categoryIds);
    return row;
  });
}

export async function getTask(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(task)
    .where(and(eq(task.id, id), eq(task.userId, userId)));
  if (!row) return null;

  const links = await db.select({ id: taskCategory.categoryId }).from(taskCategory).where(eq(taskCategory.taskId, id));
  return { ...row, categoryIds: links.map((link) => link.id) };
}

export function listTasks(userId: string, filter: { status?: TaskRow["status"]; projectId?: string } = {}) {
  return db
    .select()
    .from(task)
    .where(
      and(
        eq(task.userId, userId),
        filter.status && eq(task.status, filter.status),
        filter.projectId ? eq(task.projectId, filter.projectId) : undefined,
      ),
    )
    .orderBy(asc(task.position), asc(task.id));
}

export async function updateTask(userId: string, id: string, input: UpdateTaskInput) {
  const { categoryIds, dueDate, dueTime, ...values } = parseInput(updateSchema, input);

  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(task)
      .where(and(eq(task.id, id), eq(task.userId, userId)))
      .for("update");
    if (!current) throw new NotFoundError("Task");

    const changes: Partial<typeof task.$inferInsert> = { ...values, updatedAt: new Date() };
    if (values.status && values.status !== current.status) {
      Object.assign(changes, statusStamps(values.status), { position: await endOfColumn(tx, userId, values.status) });
    }
    if (values.projectId !== undefined && values.projectId !== current.projectId) {
      changes.number = values.projectId ? await nextNumber(tx, userId, values.projectId) : null;
    }
    if (dueDate !== undefined) Object.assign(changes, await dueFields(tx, userId, dueDate, dueTime));
    if (categoryIds) await setCategories(tx, userId, id, categoryIds);

    const [row] = await tx.update(task).set(changes).where(eq(task.id, id)).returning();
    return row;
  });
}

export async function deleteTask(userId: string, id: string) {
  const deleted = await db
    .delete(task)
    .where(and(eq(task.id, id), eq(task.userId, userId)))
    .returning({ id: task.id });
  if (deleted.length === 0) throw new NotFoundError("Task");
}
