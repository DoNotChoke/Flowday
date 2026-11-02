import { and, asc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { subtask, task } from "@/lib/db/schema";
import { NotFoundError, parseInput } from "./errors";
import { positionAfter } from "./tasks";

const titleSchema = z.object({ title: z.string().trim().min(1, "Enter an item.").max(200) });

function ordered(taskId: string) {
  return db
    .select({ id: subtask.id, position: subtask.position })
    .from(subtask)
    .where(eq(subtask.taskId, taskId))
    .orderBy(asc(subtask.position), asc(subtask.id));
}

async function ownedItem(userId: string, id: string) {
  const [row] = await db
    .select({ taskId: subtask.taskId })
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
  const [owned] = await db
    .select({ id: task.id })
    .from(task)
    .where(and(eq(task.id, taskId), eq(task.userId, userId)));
  if (!owned) throw new NotFoundError("Task");

  const items = await ordered(taskId);
  const [row] = await db
    .insert(subtask)
    .values({ taskId, title, position: positionAfter(items, items.at(-1)?.id ?? null) })
    .returning();
  return row;
}

export async function setSubtaskDone(userId: string, id: string, done: boolean) {
  await ownedItem(userId, id);
  await db.update(subtask).set({ done }).where(eq(subtask.id, id));
}

export async function renameSubtask(userId: string, id: string, input: string) {
  const { title } = parseInput(titleSchema, { title: input });
  await ownedItem(userId, id);
  await db.update(subtask).set({ title }).where(eq(subtask.id, id));
}

export async function moveSubtask(userId: string, id: string, afterId: string | null) {
  const { taskId } = await ownedItem(userId, id);
  const others = await db
    .select({ id: subtask.id, position: subtask.position })
    .from(subtask)
    .where(and(eq(subtask.taskId, taskId), ne(subtask.id, id)))
    .orderBy(asc(subtask.position), asc(subtask.id));
  await db.update(subtask).set({ position: positionAfter(others, afterId) }).where(eq(subtask.id, id));
}

export async function deleteSubtask(userId: string, id: string) {
  await ownedItem(userId, id);
  await db.delete(subtask).where(eq(subtask.id, id));
}
