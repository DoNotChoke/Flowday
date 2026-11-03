import { and, asc, eq, gte, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { utcToZoned, zonedToUtc } from "@/lib/datetime";
import { project, task } from "@/lib/db/schema";

export function addDays(date: string, days: number) {
  return new Date(Date.parse(date) + days * 86_400_000).toISOString().slice(0, 10);
}

// The days from `date`'s Monday onwards.
function daysFromMonday(date: string, count: number) {
  const start = addDays(date, -((new Date(date).getUTCDay() + 6) % 7));
  return Array.from({ length: count }, (_, index) => addDays(start, index));
}

export const weekDays = (date: string) => daysFromMonday(date, 7);

// The 6 weeks shown for the month of `date`.
export const monthGrid = (date: string) => daysFromMonday(`${date.slice(0, 8)}01`, 42);

function selectTasks() {
  return db
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
    .leftJoin(project, eq(task.projectId, project.id));
}

// Tasks from day `from` up to and including day `to`, placed on their planned day, else their due day.
// The caller passes the owner's zone, since it already needed it to know which month to show.
export async function getCalendar(userId: string, timeZone: string, from: string, to: string) {
  const when = sql<Date>`coalesce(${task.plannedAt}, ${task.dueAt})`;
  const rows = await selectTasks()
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

// Open tasks with neither a planned day nor a due day.
export async function listUnscheduled(userId: string) {
  const rows = await selectTasks()
    .where(and(eq(task.userId, userId), inArray(task.status, ["ongoing", "in_process"]), isNull(task.plannedAt), isNull(task.dueAt)))
    .orderBy(asc(task.position), asc(task.id));

  return rows.map(({ id, title, status, estimateMin, projectColor, category }) => ({
    id,
    title,
    status,
    estimateMin,
    category: category?.name ?? null,
    color: category?.color ?? projectColor ?? null,
  }));
}

export type UnscheduledTask = Awaited<ReturnType<typeof listUnscheduled>>[number];
