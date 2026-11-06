import { and, count, eq, gte, isNotNull, lt, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { addDays, utcToZoned, zonedToUtc } from "@/lib/datetime";
import { focusSession, task } from "@/lib/db/schema";
import { streaks } from "@/lib/streak";
import { getTimeZone } from "./tasks";

export const ranges = { week: 7, month: 30, year: 365 } as const;
export type Range = keyof typeof ranges;

// The owner's day of a stored instant, done by Postgres so clock changes follow the zone's own rules.
const dayOf = (column: typeof task.completedAt | typeof focusSession.endedAt, timeZone: string) =>
  sql<string>`to_char(${column} at time zone ${timeZone}, 'YYYY-MM-DD')`;

const finishedFocus = and(eq(focusSession.mode, "focus"), eq(focusSession.completed, true));

// A day counts when a task was finished or a focus session ran to the end.
export async function getStreak(userId: string) {
  const timeZone = await getTimeZone(userId);
  const [taskDays, focusDays] = await Promise.all([
    db
      .selectDistinct({ day: dayOf(task.completedAt, timeZone) })
      .from(task)
      .where(and(eq(task.userId, userId), isNotNull(task.completedAt))),
    db
      .selectDistinct({ day: dayOf(focusSession.endedAt, timeZone) })
      .from(focusSession)
      .where(and(eq(focusSession.userId, userId), finishedFocus)),
  ]);
  const today = utcToZoned(new Date(), timeZone).date;
  const days = [...new Set([...taskDays, ...focusDays].map((row) => row.day))].sort();
  return { ...streaks(days, today), today, days };
}

// Tasks finished, focus sessions finished and focus seconds per day, from day `from` to day `to` inclusive.
export async function activityDays(userId: string, timeZone: string, from: string, to: string) {
  const start = zonedToUtc(from, null, timeZone);
  const end = zonedToUtc(addDays(to, 1), null, timeZone);
  const taskDay = dayOf(task.completedAt, timeZone);
  const focusDay = dayOf(focusSession.endedAt, timeZone);
  const [tasks, sessions] = await Promise.all([
    db
      .select({ day: taskDay, total: count() })
      .from(task)
      .where(and(eq(task.userId, userId), gte(task.completedAt, start), lt(task.completedAt, end)))
      // By position: the zone is a separate parameter in each place, so Postgres would not see the same expression.
      .groupBy(sql`1`),
    db
      .select({
        day: focusDay,
        finished: sql<number>`count(*) filter (where ${finishedFocus})::int`,
        seconds: sql<number>`coalesce(sum(${focusSession.seconds}) filter (where ${focusSession.mode} = 'focus'), 0)::int`,
      })
      .from(focusSession)
      .where(and(eq(focusSession.userId, userId), gte(focusSession.endedAt, start), lt(focusSession.endedAt, end)))
      .groupBy(sql`1`),
  ]);

  const days = new Map<string, { tasks: number; sessions: number; focusSeconds: number }>();
  const entry = (day: string) => {
    if (!days.has(day)) days.set(day, { tasks: 0, sessions: 0, focusSeconds: 0 });
    return days.get(day)!;
  };
  for (const row of tasks) entry(row.day).tasks = row.total;
  for (const row of sessions) Object.assign(entry(row.day), { sessions: row.finished, focusSeconds: row.seconds });
  return days;
}

async function completion(userId: string, start: Date, end: Date) {
  const [row] = await db
    .select({ total: count(), done: sql<number>`count(*) filter (where ${task.status} = 'completed')::int` })
    .from(task)
    .where(and(eq(task.userId, userId), ne(task.status, "canceled"), gte(task.createdAt, start), lt(task.createdAt, end)));
  return row.total ? Math.round((row.done / row.total) * 100) : null;
}

// The KPIs for the last week, month or year, ending today.
export async function getSummary(userId: string, range: Range) {
  const timeZone = await getTimeZone(userId);
  const length = ranges[range];
  const today = utcToZoned(new Date(), timeZone).date;
  const at = (day: string) => zonedToUtc(day, null, timeZone);
  const start = at(addDays(today, 1 - length));
  const end = at(addDays(today, 1));
  const before = at(addDays(today, 1 - 2 * length));

  const [rate, previousRate, [focus]] = await Promise.all([
    completion(userId, start, end),
    completion(userId, before, start),
    db
      .select({ seconds: sql<number>`coalesce(sum(${focusSession.seconds}), 0)::int` })
      .from(focusSession)
      .where(and(eq(focusSession.userId, userId), eq(focusSession.mode, "focus"), gte(focusSession.endedAt, start), lt(focusSession.endedAt, end))),
  ]);

  return {
    // Percent of the tasks created in the range, canceled ones aside, that are finished; null with none.
    completionRate: rate,
    completionChange: rate !== null && previousRate !== null ? rate - previousRate : null,
    focusSeconds: focus.seconds,
    focusPerDay: Math.round(focus.seconds / length),
  };
}

const weekdayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const HEATMAP_WEEKS = 53;

// Every day of the last 53 weeks, from a Monday to today, with what was done on it.
export async function getHeatmap(userId: string) {
  const timeZone = await getTimeZone(userId);
  const today = utcToZoned(new Date(), timeZone).date;
  const monday = addDays(today, -((new Date(today).getUTCDay() + 6) % 7));
  const from = addDays(monday, -7 * (HEATMAP_WEEKS - 1));
  const activity = await activityDays(userId, timeZone, from, today);

  const days = [];
  const byWeekday = Array(7).fill(0);
  for (let day = from, index = 0; day <= today; day = addDays(day, 1), index++) {
    const { tasks, sessions } = activity.get(day) ?? { tasks: 0, sessions: 0 };
    days.push({ day, tasks, sessions });
    byWeekday[index % 7] += tasks + sessions;
  }
  const busiest = Math.max(...byWeekday);

  return {
    today,
    days,
    tasks: days.reduce((sum, day) => sum + day.tasks, 0),
    mostActive: busiest ? weekdayNames[byWeekday.indexOf(busiest)] : null,
  };
}
