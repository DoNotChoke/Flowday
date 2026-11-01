import { and, asc, count, desc, eq, gte, inArray, lt, notInArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { utcToZoned, zonedToUtc } from "@/lib/datetime";
import { project, task, taskCategory, user } from "@/lib/db/schema";

type Status = (typeof task.$inferSelect)["status"];

export type BoardFilter = { categoryId?: string; projectId?: string; sort?: "manual" | "priority" | "due" };

const WEEK = 7 * 86_400_000;

export function percentDone(status: Status, done: number, total: number) {
  if (total > 0) return Math.round((done / total) * 100);
  return status === "completed" ? 100 : 0;
}

const order = {
  manual: [asc(task.position), asc(task.id)],
  priority: [desc(task.priority), asc(task.position), asc(task.id)],
  due: [sql`${task.dueAt} asc nulls last`, asc(task.position), asc(task.id)],
};

function listCards(userId: string, { categoryId, projectId, sort = "manual" }: BoardFilter) {
  const inCategory = categoryId
    ? inArray(task.id, db.select({ id: taskCategory.taskId }).from(taskCategory).where(eq(taskCategory.categoryId, categoryId)))
    : undefined;

  return db
    .select({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueAt: task.dueAt,
      number: task.number,
      projectName: project.name,
      projectKey: project.key,
      categories: sql<string[]>`array(
        select c.name from task_category tc join category c on c.id = tc.category_id
        where tc.task_id = ${task.id} order by c.name
      )`,
      subtasksTotal: sql<number>`(select count(*)::int from subtask s where s.task_id = ${task.id})`,
      subtasksDone: sql<number>`(select count(*)::int from subtask s where s.task_id = ${task.id} and s.done)`,
    })
    .from(task)
    .leftJoin(project, eq(task.projectId, project.id))
    .where(and(eq(task.userId, userId), projectId ? eq(task.projectId, projectId) : undefined, inCategory))
    .orderBy(...order[sort]);
}

export async function countOpenTasks(userId: string) {
  const [row] = await db
    .select({ open: count() })
    .from(task)
    .where(and(eq(task.userId, userId), inArray(task.status, ["ongoing", "in_process"])));
  return row.open;
}

export async function getBoard(userId: string, filter: BoardFilter = {}) {
  const [owner] = await db.select({ name: user.name, timezone: user.timezone }).from(user).where(eq(user.id, userId));
  const timeZone = owner.timezone ?? "UTC";
  const now = new Date();
  const today = utcToZoned(now, timeZone).date;
  const dayStart = zonedToUtc(today, null, timeZone);
  const dayEnd = zonedToUtc(new Date(Date.parse(today) + 86_400_000).toISOString().slice(0, 10), null, timeZone);
  const weekAgo = new Date(now.getTime() - WEEK);

  const [cards, counts, addedThisWeek, closedThisWeek, dueRows] = await Promise.all([
    listCards(userId, filter),
    db.select({ status: task.status, total: count() }).from(task).where(eq(task.userId, userId)).groupBy(task.status),
    db
      .select({ total: count() })
      .from(task)
      .where(and(eq(task.userId, userId), eq(task.status, "ongoing"), gte(task.createdAt, weekAgo))),
    db
      .select({
        completed: sql<number>`count(*) filter (where ${task.completedAt} >= ${weekAgo.toISOString()})::int`,
        canceled: sql<number>`count(*) filter (where ${task.canceledAt} >= ${weekAgo.toISOString()})::int`,
      })
      .from(task)
      .where(eq(task.userId, userId)),
    db
      .select({ status: task.status })
      .from(task)
      .where(
        and(
          eq(task.userId, userId),
          gte(task.dueAt, dayStart),
          lt(task.dueAt, dayEnd),
          notInArray(task.status, ["completed", "canceled"]),
        ),
      ),
  ]);

  const countOf = (status: Status) => counts.find((row) => row.status === status)?.total ?? 0;
  const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone });

  return {
    name: owner.name,
    dateLabel: new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone }).format(now),
    dueToday: dueRows.length,
    stats: {
      ongoing: { count: countOf("ongoing"), delta: `+${addedThisWeek[0].total}` },
      in_process: { count: countOf("in_process"), delta: `${dueRows.filter((row) => row.status === "in_process").length} today` },
      completed: { count: countOf("completed"), delta: `+${closedThisWeek[0].completed} wk` },
      canceled: { count: countOf("canceled"), delta: `+${closedThisWeek[0].canceled} wk` },
    },
    tasks: cards.map(({ dueAt, number, projectKey, ...card }) => ({
      ...card,
      code: projectKey && number ? `${projectKey}-${number}` : null,
      dueToday: Boolean(dueAt && dueAt >= dayStart && dueAt < dayEnd),
      dueLabel: !dueAt ? null : dueAt >= dayStart && dueAt < dayEnd ? "Today" : shortDate.format(dueAt),
    })),
  };
}
