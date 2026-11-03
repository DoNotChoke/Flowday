import { and, asc, eq, gte, lt, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { utcToZoned, zonedToUtc } from "@/lib/datetime";
import { project, task } from "@/lib/db/schema";

export function addDays(date: string, days: number) {
  return new Date(Date.parse(date) + days * 86_400_000).toISOString().slice(0, 10);
}

// The 6 weeks shown for the month of `date`, starting on a Monday.
export function monthGrid(date: string) {
  const first = `${date.slice(0, 8)}01`;
  const start = addDays(first, -((new Date(first).getUTCDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

// Tasks from day `from` up to and including day `to`, placed on their planned day, else their due day.
// The caller passes the owner's zone, since it already needed it to know which month to show.
export async function getCalendar(userId: string, timeZone: string, from: string, to: string) {
  const when = sql<Date>`coalesce(${task.plannedAt}, ${task.dueAt})`;
  const rows = await db
    .select({
      id: task.id,
      title: task.title,
      status: task.status,
      plannedAt: task.plannedAt,
      dueAt: task.dueAt,
      dueHasTime: task.dueHasTime,
      estimateMin: task.estimateMin,
      projectColor: project.color,
      category: sql<{ name: string; color: string } | null>`(
        select json_build_object('name', c.name, 'color', c.color) from task_category tc join category c on c.id = tc.category_id
        where tc.task_id = ${task.id} order by c.name limit 1
      )`,
    })
    .from(task)
    .leftJoin(project, eq(task.projectId, project.id))
    .where(
      and(
        eq(task.userId, userId),
        ne(task.status, "canceled"),
        gte(when, zonedToUtc(from, null, timeZone)),
        lt(when, zonedToUtc(addDays(to, 1), null, timeZone)),
      ),
    )
    .orderBy(asc(when), asc(task.position));

  return rows.map(({ plannedAt, dueAt, dueHasTime, projectColor, category, ...row }) => {
      const due = dueAt && utcToZoned(dueAt, timeZone);
      return {
        ...row,
        day: plannedAt ? utcToZoned(plannedAt, timeZone).date : due!.date,
        kind: plannedAt ? ("planned" as const) : ("due" as const),
        time: !plannedAt && dueHasTime ? due!.time : null,
        category: category?.name ?? null,
        color: category?.color ?? projectColor ?? null,
      };
  });
}

export type CalendarItem = Awaited<ReturnType<typeof getCalendar>>[number];
