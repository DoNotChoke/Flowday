import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { focusMode, focusSession, task } from "@/lib/db/schema";
import { NotFoundError, parseInput } from "./errors";

const MAX_SECONDS = 4 * 60 * 60;
// Allows for the browser's clock running a little ahead of the server's.
const CLOCK_SLACK_MS = 60_000;

const sessionSchema = z
  .object({
    id: z.uuid(),
    taskId: z.string().nullable(),
    mode: z.enum(focusMode.enumValues),
    startedAt: z.number().int(),
    endedAt: z.number().int(),
    seconds: z.number().int().min(0).max(MAX_SECONDS),
    completed: z.boolean(),
  })
  // The browser's numbers are not trusted: a session cannot outlast the time it spanned or end in the future.
  .refine((session) => session.endedAt >= session.startedAt, { path: ["endedAt"], message: "A session cannot end before it starts." })
  .refine((session) => session.endedAt <= Date.now() + CLOCK_SLACK_MS, { path: ["endedAt"], message: "A session cannot end in the future." })
  .refine((session) => session.seconds * 1000 <= session.endedAt - session.startedAt + 1000, { path: ["seconds"], message: "More time than the session spanned." });

export type FocusSessionInput = z.input<typeof sessionSchema>;

export async function recordSession(userId: string, input: FocusSessionInput) {
  const session = parseInput(sessionSchema, input);
  if (session.taskId) {
    const [owned] = await db.select({ id: task.id }).from(task).where(and(eq(task.id, session.taskId), eq(task.userId, userId)));
    if (!owned) throw new NotFoundError("Task");
  }
  await db
    .insert(focusSession)
    .values({ ...session, userId, startedAt: new Date(session.startedAt), endedAt: new Date(session.endedAt) })
    .onConflictDoNothing();
}

// Seconds of focus spent on a task; breaks do not count.
export async function trackedSeconds(userId: string, taskId: string) {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${focusSession.seconds}), 0)::int` })
    .from(focusSession)
    .where(and(eq(focusSession.userId, userId), eq(focusSession.taskId, taskId), eq(focusSession.mode, "focus")));
  return row.total;
}
