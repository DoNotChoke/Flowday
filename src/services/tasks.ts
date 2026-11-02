import { and, asc, desc, eq, inArray, max, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { category, project, task, taskCategory, taskPriority, taskStatus, user } from "@/lib/db/schema";
import { utcToZoned, zonedToUtc } from "@/lib/datetime";
import { recordActivity, type Actor } from "./activity";
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
const moveSchema = z.object({ status: fields.status, afterId: z.string().nullable() });

const editable = [
  { key: "title", field: "title" },
  { key: "description", field: "description" },
  { key: "priority", field: "priority" },
  { key: "estimateMin", field: "estimate" },
  { key: "alertEnabled", field: "alert" },
] as const;

export type CreateTaskInput = z.input<typeof createSchema>;
export type UpdateTaskInput = z.input<typeof updateSchema>;
export type MoveTaskInput = z.input<typeof moveSchema>;

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

export async function createTask(userId: string, input: CreateTaskInput, actor: Actor = "user") {
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
    await recordActivity(tx, row.id, "created", null, actor);
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

export async function getTaskDetail(userId: string, id: string) {
  const row = await getTask(userId, id);
  if (!row) return null;

  const [[owner], [linked]] = await Promise.all([
    db.select({ timezone: user.timezone }).from(user).where(eq(user.id, userId)),
    row.projectId ? db.select({ key: project.key, name: project.name }).from(project).where(eq(project.id, row.projectId)) : [undefined],
  ]);
  const timeZone = owner.timezone ?? "UTC";
  const due = row.dueAt && utcToZoned(row.dueAt, timeZone);
  const dueTime = due && row.dueHasTime ? due.time : "";
  const day = row.dueAt && new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone }).format(row.dueAt);

  return {
    ...row,
    timeZone,
    code: linked && row.number ? `${linked.key}-${row.number}` : null,
    projectName: linked?.name ?? null,
    dueDate: due ? due.date : "",
    dueTime,
    dueLabel: day ? [day, dueTime].filter(Boolean).join(", ") : null,
  };
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

export async function searchTasks(userId: string, query: string) {
  const term = query.trim().slice(0, 100);
  if (!term) return [];
  // strpos rather than ILIKE: % and _ in a search are plain characters.
  const needle = sql`lower(unaccent(${term}))`;

  const rows = await db
    .select({ id: task.id, title: task.title, status: task.status, number: task.number, projectKey: project.key })
    .from(task)
    .leftJoin(project, eq(task.projectId, project.id))
    .where(
      and(
        eq(task.userId, userId),
        or(
          sql`strpos(lower(unaccent(${task.title})), ${needle}) > 0`,
          sql`strpos(lower(unaccent(${task.description})), ${needle}) > 0`,
        ),
      ),
    )
    .orderBy(desc(task.updatedAt), asc(task.id))
    .limit(20);
  return rows.map(({ number, projectKey, ...row }) => ({ ...row, code: projectKey && number ? `${projectKey}-${number}` : null }));
}

export async function updateTask(userId: string, id: string, input: UpdateTaskInput, actor: Actor = "user") {
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
    const edited: string[] = editable.filter(({ key }) => values[key] !== undefined && values[key] !== current[key]).map(({ field }) => field);
    if (values.projectId !== undefined && values.projectId !== current.projectId) {
      changes.number = values.projectId ? await nextNumber(tx, userId, values.projectId) : null;
      edited.push("project");
    }
    if (dueDate !== undefined) {
      const due = await dueFields(tx, userId, dueDate, dueTime);
      Object.assign(changes, due);
      if (due.dueAt?.getTime() !== current.dueAt?.getTime() || due.dueHasTime !== current.dueHasTime) edited.push("deadline");
    }
    if (categoryIds) {
      const links = await tx.select({ id: taskCategory.categoryId }).from(taskCategory).where(eq(taskCategory.taskId, id));
      if (links.length !== new Set(categoryIds).size || links.some((link) => !categoryIds.includes(link.id))) edited.push("categories");
      await setCategories(tx, userId, id, categoryIds);
    }

    const [row] = await tx.update(task).set(changes).where(eq(task.id, id)).returning();
    if (row.status !== current.status) await recordActivity(tx, id, "status", { from: current.status, to: row.status }, actor);
    for (const field of edited) await recordActivity(tx, id, "updated", { field }, actor);
    return row;
  });
}

// shortcut: positions run out of float precision after about 50 inserts into the same gap, renumber the column when two cards get too close.
export function positionAfter(cards: { id: string; position: number }[], afterId: string | null) {
  if (afterId === null) return cards.length > 0 ? cards[0].position - POSITION_GAP : POSITION_GAP;
  const index = cards.findIndex((card) => card.id === afterId);
  // -1 picks the last card: a neighbour that left the column sends the task to the end.
  const previous = cards.at(index);
  const next = index === -1 ? undefined : cards[index + 1];
  if (!previous) return POSITION_GAP;
  return next ? (previous.position + next.position) / 2 : previous.position + POSITION_GAP;
}

export async function moveTask(userId: string, id: string, input: MoveTaskInput, actor: Actor = "user") {
  const { status, afterId } = parseInput(moveSchema, input);

  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(task)
      .where(and(eq(task.id, id), eq(task.userId, userId)))
      .for("update");
    if (!current) throw new NotFoundError("Task");

    const cards = await tx
      .select({ id: task.id, position: task.position })
      .from(task)
      .where(and(eq(task.userId, userId), eq(task.status, status), ne(task.id, id)))
      .orderBy(asc(task.position), asc(task.id));

    const [row] = await tx
      .update(task)
      .set({
        status,
        position: positionAfter(cards, afterId),
        updatedAt: new Date(),
        ...(status !== current.status && statusStamps(status)),
      })
      .where(eq(task.id, id))
      .returning();
    if (status !== current.status) await recordActivity(tx, id, "status", { from: current.status, to: status }, actor);
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
