import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { activity, activityActor, task } from "@/lib/db/schema";
import { NotFoundError, parseInput } from "./errors";
import type { Transaction } from "./tasks";

export type Actor = (typeof activityActor.enumValues)[number];
export type ActivityPayload = { field?: string; from?: string; to?: string; title?: string; done?: boolean; body?: string };

const commentSchema = z.object({ body: z.string().trim().min(1, "Write a comment.").max(5000) });

export async function recordActivity(tx: Transaction, taskId: string, type: string, payload: ActivityPayload | null = null, actor: Actor = "user") {
  await tx.insert(activity).values({ taskId, type, payload, actor });
}

export async function addComment(userId: string, taskId: string, input: string) {
  const { body } = parseInput(commentSchema, { body: input });
  const [owned] = await db
    .select({ id: task.id })
    .from(task)
    .where(and(eq(task.id, taskId), eq(task.userId, userId)));
  if (!owned) throw new NotFoundError("Task");

  await db.insert(activity).values({ taskId, type: "comment", payload: { body }, actor: "user" });
}

export async function listActivity(userId: string, taskId: string) {
  const rows = await db
    .select({ id: activity.id, type: activity.type, actor: activity.actor, payload: activity.payload, createdAt: activity.createdAt })
    .from(activity)
    .innerJoin(task, eq(activity.taskId, task.id))
    .where(and(eq(activity.taskId, taskId), eq(task.userId, userId)))
    .orderBy(desc(activity.createdAt));
  return rows.map((row) => ({ ...row, payload: row.payload as ActivityPayload | null }));
}
