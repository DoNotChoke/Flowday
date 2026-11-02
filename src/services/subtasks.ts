import { and, asc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { subtask, task } from "@/lib/db/schema";
import { recordActivity } from "./activity";
import { NotFoundError, parseInput } from "./errors";
import { positionAfter, type Transaction } from "./tasks";

const titleSchema = z.object({ title: z.string().trim().min(1, "Enter an item.").max(200) });

async function ownedItem(tx: Transaction, userId: string, id: string) {
  const [row] = await tx
    .select({ taskId: subtask.taskId, title: subtask.title })
    .from(subtask)
    .innerJoin(task, eq(subtask.taskId, task.id))
    .where(and(eq(subtask.id, id), eq(task.userId, userId)));
  if (!row) throw new NotFoundError("Item");
  return row;
}

export function listSubtasks(userId: string, taskId: string) {
  return db
    .select({ id: subtask.id, title: subtask.title, done: subtask.done })
    .from(subtask)
    .innerJoin(task, eq(subtask.taskId, task.id))
    .where(and(eq(subtask.taskId, taskId), eq(task.userId, userId)))
    .orderBy(asc(subtask.position), asc(subtask.id));
}

export async function addSubtask(userId: string, taskId: string, input: string) {
  const { title } = parseInput(titleSchema, { title: input });

  return db.transaction(async (tx) => {
    const [owned] = await tx
      .select({ id: task.id })
      .from(task)
      .where(and(eq(task.id, taskId), eq(task.userId, userId)));
    if (!owned) throw new NotFoundError("Task");

    const items = await tx
      .select({ id: subtask.id, position: subtask.position })
      .from(subtask)
      .where(eq(subtask.taskId, taskId))
      .orderBy(asc(subtask.position), asc(subtask.id));
    const [row] = await tx
      .insert(subtask)
      .values({ taskId, title, position: positionAfter(items, items.at(-1)?.id ?? null) })
      .returning();
    await recordActivity(tx, taskId, "subtask_added", { title });
    return row;
  });
}

export async function setSubtaskDone(userId: string, id: string, done: boolean) {
  await db.transaction(async (tx) => {
    const { taskId, title } = await ownedItem(tx, userId, id);
    await tx.update(subtask).set({ done }).where(eq(subtask.id, id));
    await recordActivity(tx, taskId, "subtask_done", { title, done });
  });
}

export async function renameSubtask(userId: string, id: string, input: string) {
  const { title } = parseInput(titleSchema, { title: input });

  await db.transaction(async (tx) => {
    const { taskId } = await ownedItem(tx, userId, id);
    await tx.update(subtask).set({ title }).where(eq(subtask.id, id));
    await recordActivity(tx, taskId, "subtask_renamed", { title });
  });
}

export async function moveSubtask(userId: string, id: string, afterId: string | null) {
  await db.transaction(async (tx) => {
    const { taskId } = await ownedItem(tx, userId, id);
    const others = await tx
      .select({ id: subtask.id, position: subtask.position })
      .from(subtask)
      .where(and(eq(subtask.taskId, taskId), ne(subtask.id, id)))
      .orderBy(asc(subtask.position), asc(subtask.id));
    await tx.update(subtask).set({ position: positionAfter(others, afterId) }).where(eq(subtask.id, id));
  });
}

export async function deleteSubtask(userId: string, id: string) {
  await db.transaction(async (tx) => {
    const { taskId, title } = await ownedItem(tx, userId, id);
    await tx.delete(subtask).where(eq(subtask.id, id));
    await recordActivity(tx, taskId, "subtask_deleted", { title });
  });
}
