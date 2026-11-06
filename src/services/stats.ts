import { and, count, desc, eq, gte, isNotNull, lt, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { addDays, utcToZoned, zonedToUtc } from "@/lib/datetime";
import { focusSession, project, task } from "@/lib/db/schema";
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

// Where a range starts: whole days back from today, or the first of the month eleven months back for a year.
function rangeStart(today: string, range: Range) {
  if (range !== "year") return addDays(today, 1 - ranges[range]);
  const [year, month] = today.split("-").map(Number);
  return new Date(Date.UTC(year, month - 12, 1)).toISOString().slice(0, 10);
}

// Tasks created and finished per day, or per month over a year.
export async function getDailyOverview(userId: string, range: Range) {
  const timeZone = await getTimeZone(userId);
  const today = utcToZoned(new Date(), timeZone).date;
  const from = rangeStart(today, range);
  const start = zonedToUtc(from, null, timeZone);
  const format = range === "year" ? "YYYY-MM" : "YYYY-MM-DD";
  const bucket = (column: typeof task.createdAt | typeof task.completedAt) => sql<string>`to_char(${column} at time zone ${timeZone}, ${format})`;

  const [created, completed] = await Promise.all([
    db
      .select({ key: bucket(task.createdAt), total: count() })
      .from(task)
      .where(and(eq(task.userId, userId), gte(task.createdAt, start)))
      .groupBy(sql`1`),
    db
      .select({ key: bucket(task.completedAt), total: count() })
      .from(task)
      .where(and(eq(task.userId, userId), gte(task.completedAt, start)))
      .groupBy(sql`1`),
  ]);
  const totals = (rows: { key: string; total: number }[]) => new Map(rows.map((row) => [row.key, row.total]));
  const [made, done] = [totals(created), totals(completed)];

  const keys: string[] = [];
  if (range === "year") for (let index = 0; index < 12; index++) keys.push(new Date(Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1 + index, 1)).toISOString().slice(0, 7));
  else for (let day = from; day <= today; day = addDays(day, 1)) keys.push(day);
  return keys.map((key) => ({ key, created: made.get(key) ?? 0, completed: done.get(key) ?? 0 }));
}

// Focus hours per category over the range; a task counts toward its first category by name.
export async function focusByCategory(userId: string, range: Range) {
  const timeZone = await getTimeZone(userId);
  const start = zonedToUtc(rangeStart(utcToZoned(new Date(), timeZone).date, range), null, timeZone);
  const first = (column: "name" | "color") =>
    sql.raw(`(select c.${column} from task_category tc join category c on c.id = tc.category_id where tc.task_id = "task"."id" order by c.name limit 1)`);

  const rows = await db
    .select({ name: sql<string | null>`${first("name")}`, color: sql<string | null>`${first("color")}`, seconds: sql<number>`sum(${focusSession.seconds})::int` })
    .from(focusSession)
    .leftJoin(task, eq(focusSession.taskId, task.id))
    .where(and(eq(focusSession.userId, userId), eq(focusSession.mode, "focus"), gte(focusSession.endedAt, start)))
    .groupBy(sql`1`, sql`2`)
    .orderBy(sql`3 desc`);
  return rows.map((row) => ({ name: row.name ?? "Uncategorized", color: row.color, seconds: row.seconds }));
}

export async function recentlyCompleted(userId: string, limit = 5) {
  return db
    .select({
      id: task.id,
      title: task.title,
      completedAt: task.completedAt,
      category: sql<string | null>`(select c.name from task_category tc join category c on c.id = tc.category_id where tc.task_id = "task"."id" order by c.name limit 1)`,
    })
    .from(task)
    .where(and(eq(task.userId, userId), isNotNull(task.completedAt)))
    .orderBy(desc(task.completedAt))
    .limit(limit);
}

// Every task finished in the range, oldest first, as the rows of the CSV export.
export async function completedInRange(userId: string, range: Range) {
  const timeZone = await getTimeZone(userId);
  const start = zonedToUtc(rangeStart(utcToZoned(new Date(), timeZone).date, range), null, timeZone);
  const rows = await db
    .select({
      completedAt: task.completedAt,
      number: task.number,
      projectKey: project.key,
      title: task.title,
      projectName: project.name,
      categories: sql<string>`coalesce((select string_agg(c.name, '; ' order by c.name) from task_category tc join category c on c.id = tc.category_id where tc.task_id = ${task.id}), '')`,
      estimateMin: task.estimateMin,
      focusSeconds: sql<number>`(select coalesce(sum(f.seconds), 0)::int from focus_session f where f.task_id = ${task.id} and f.mode = 'focus')`,
    })
    .from(task)
    .leftJoin(project, eq(task.projectId, project.id))
    .where(and(eq(task.userId, userId), gte(task.completedAt, start)))
    .orderBy(task.completedAt);

  return rows.map((row) => {
    const at = utcToZoned(row.completedAt!, timeZone);
    return {
      completed: `${at.date} ${at.time}`,
      code: row.projectKey && row.number ? `${row.projectKey}-${row.number}` : "",
      title: row.title,
      project: row.projectName ?? "",
      categories: row.categories,
      estimateMin: row.estimateMin,
      focusMin: Math.round(row.focusSeconds / 60),
    };
  });
}

type BadgeFacts = { longestStreak: number; completed: number; earlyBird: boolean; open: number };

// The six badges and whether each is earned. Worked out on each visit, nothing stored.
// shortcut: badges are not stored, so Inbox zero locks again once a task is open; add an achievement table to keep them.
export function badges({ longestStreak, completed, earlyBird, open }: BadgeFacts) {
  return [
    { key: "streak-7", big: "7", label: "7-day streak", tone: "bg-coral", earned: longestStreak >= 7 },
    { key: "tasks-100", big: "100", label: "100 tasks", tone: "bg-teal", earned: completed >= 100 },
    { key: "early-bird", big: "5AM", label: "Early bird", tone: "bg-blue", earned: earlyBird },
    { key: "streak-30", big: "30", label: "30-day streak", tone: "bg-coral", earned: longestStreak >= 30 },
    { key: "tasks-500", big: "500", label: "500 tasks", tone: "bg-teal", earned: completed >= 500 },
    { key: "inbox-zero", big: "0", label: "Inbox zero", tone: "bg-sun", earned: completed > 0 && open === 0 },
  ];
}

export async function getBadges(userId: string, longestStreak: number) {
  const timeZone = await getTimeZone(userId);
  const [row] = await db
    .select({
      completed: sql<number>`count(*) filter (where ${task.completedAt} is not null)::int`,
      open: sql<number>`count(*) filter (where ${task.status} in ('ongoing', 'in_process'))::int`,
      // Before 6 in the morning, in the owner's zone.
      earlyBird: sql<boolean>`coalesce(bool_or(extract(hour from ${task.completedAt} at time zone ${timeZone}) < 6), false)`,
    })
    .from(task)
    .where(eq(task.userId, userId));
  return badges({ longestStreak, ...row });
}
