import { and, count, eq, isNotNull, isNull, like, asc, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { burndown } from "@/lib/burndown";
import { utcToZoned } from "@/lib/datetime";
import { activity, focusSession, project, task } from "@/lib/db/schema";
import { projectColors, projectIcons, projectKey, projectTemplates } from "@/lib/projects";
import { NotFoundError, parseInput } from "./errors";
import { endOfColumn, getTimeZone, POSITION_GAP } from "./tasks";

const fields = z.object({
  name: z.string().trim().min(1, "Enter a project name.").max(80),
  description: z.string().max(10_000).nullable().optional(),
  color: z.enum(projectColors.map((color) => color.hex)),
  icon: z.enum(projectIcons.map((icon) => icon.name)),
  startDate: z.iso.date().nullable().optional(),
  targetDate: z.iso.date().nullable().optional(),
  budgetHours: z.number().int().min(0).max(100_000).nullable().optional(),
});
const datesInOrder = {
  check: ({ startDate, targetDate }: { startDate?: string | null; targetDate?: string | null }) => !startDate || !targetDate || targetDate >= startDate,
  options: { path: ["targetDate"], message: "The end date must come after the start date." },
};

const createSchema = fields
  .extend({ template: z.enum(projectTemplates.map((template) => template.id)), withStarterTasks: z.boolean().default(true) })
  .refine(datesInOrder.check, datesInOrder.options);
const updateSchema = fields.refine(datesInOrder.check, datesInOrder.options);

export type CreateProjectInput = z.input<typeof createSchema>;
export type UpdateProjectInput = z.input<typeof updateSchema>;

export async function createProject(userId: string, input: CreateProjectInput) {
  const { withStarterTasks, ...values } = parseInput(createSchema, input);
  const base = projectKey(values.name);
  const template = projectTemplates.find((option) => option.id === values.template);
  const starter = withStarterTasks && template ? template.starter : [];

  return db.transaction(async (tx) => {
    const taken = await tx
      .select({ key: project.key })
      .from(project)
      .where(and(eq(project.userId, userId), like(project.key, `${base}%`)));
    const keys = new Set(taken.map((row) => row.key));
    let key = base;
    for (let suffix = 2; keys.has(key); suffix++) key = `${base}${suffix}`;

    const [row] = await tx
      .insert(project)
      .values({ ...values, userId, key, taskSeq: starter.length })
      .returning();
    const start = await endOfColumn(tx, userId, "ongoing");
    if (starter.length > 0) {
      const tasks = await tx
        .insert(task)
        .values(
          starter.map((title, index) => ({
            userId,
            title,
            projectId: row.id,
            number: index + 1,
            position: start + index * POSITION_GAP,
          })),
        )
        .returning({ id: task.id });
      await tx.insert(activity).values(tasks.map(({ id }) => ({ taskId: id, type: "created", actor: "user" as const })));
    }
    return row;
  });
}

export async function getProject(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, id), eq(project.userId, userId)));
  return row ?? null;
}

async function setProject(userId: string, id: string, values: Partial<typeof project.$inferInsert>) {
  const [row] = await db
    .update(project)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(project.id, id), eq(project.userId, userId)))
    .returning();
  if (!row) throw new NotFoundError("Project");
  return row;
}

export async function updateProject(userId: string, id: string, input: UpdateProjectInput) {
  return setProject(userId, id, parseInput(updateSchema, input));
}

export async function archiveProject(userId: string, id: string) {
  await setProject(userId, id, { archivedAt: new Date() });
}

export async function restoreProject(userId: string, id: string) {
  await setProject(userId, id, { archivedAt: null });
}

function daysLabel(days: number) {
  if (days === 0) return "Due today";
  const count = Math.abs(days);
  return `${count} ${count === 1 ? "day" : "days"} ${days > 0 ? "left" : "overdue"}`;
}

export async function getProjectOverview(userId: string, id: string, now = new Date()) {
  const row = await getProject(userId, id);
  if (!row) return null;

  const [timeZone, tasks] = await Promise.all([
    getTimeZone(userId),
    db.select({ status: task.status, dueAt: task.dueAt }).from(task).where(and(eq(task.projectId, id), eq(task.userId, userId))),
  ]);
  const today = utcToZoned(now, timeZone).date;
  const counted = tasks.filter(({ status }) => status !== "canceled");
  const done = counted.filter(({ status }) => status === "completed").length;
  const opened = counted.filter(({ status }) => status !== "completed");
  const target = row.targetDate && new Date(row.targetDate);

  return {
    ...row,
    templateName: projectTemplates.find((option) => option.id === row.template)?.name ?? null,
    iconPath: projectIcons.find((option) => option.name === row.icon)?.path ?? null,
    done,
    total: counted.length,
    open: opened.length,
    overdue: opened.filter(({ dueAt }) => dueAt && utcToZoned(dueAt, timeZone).date < today).length,
    percent: counted.length ? Math.round((done / counted.length) * 100) : 0,
    targetLabel: target
      ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: row.targetDate?.slice(0, 4) === today.slice(0, 4) ? undefined : "numeric", timeZone: "UTC" }).format(target)
      : null,
    daysLabel: target ? daysLabel(Math.round((target.getTime() - Date.parse(today)) / 86_400_000)) : null,
  };
}

export function listArchivedProjects(userId: string) {
  return db
    .select({ id: project.id, name: project.name, color: project.color })
    .from(project)
    .where(and(eq(project.userId, userId), isNotNull(project.archivedAt)))
    .orderBy(asc(project.name));
}

export function listProjects(userId: string) {
  return db
    .select({ id: project.id, name: project.name, color: project.color, taskCount: count(task.id) })
    .from(project)
    .leftJoin(task, eq(task.projectId, project.id))
    .where(and(eq(project.userId, userId), isNull(project.archivedAt)))
    .groupBy(project.id)
    .orderBy(asc(project.createdAt));
}

// Focus time against estimates, and the burndown, for one project. Canceled tasks are left out of both.
export async function getProjectTime(userId: string, id: string) {
  const row = await getProject(userId, id);
  if (!row) return null;

  const [timeZone, tasks, [focus]] = await Promise.all([
    getTimeZone(userId),
    db
      .select({ estimateMin: task.estimateMin, createdAt: task.createdAt, completedAt: task.completedAt })
      .from(task)
      .where(and(eq(task.projectId, id), eq(task.userId, userId), ne(task.status, "canceled"))),
    db
      .select({ seconds: sql<number>`coalesce(sum(${focusSession.seconds}), 0)::int` })
      .from(focusSession)
      .innerJoin(task, eq(focusSession.taskId, task.id))
      .where(and(eq(task.projectId, id), eq(focusSession.userId, userId), eq(focusSession.mode, "focus"))),
  ]);
  const dayOf = (instant: Date) => utcToZoned(instant, timeZone).date;
  const today = dayOf(new Date());
  const shaped = tasks.map((entry) => ({ estimateMin: entry.estimateMin, created: dayOf(entry.createdAt), completed: entry.completedAt && dayOf(entry.completedAt) }));
  const estimateMin = shaped.reduce((sum, entry) => sum + (entry.estimateMin ?? 0), 0);
  // Without a start date the line begins the day the first task was added.
  const from = row.startDate ?? shaped.map((entry) => entry.created).sort()[0];
  const to = row.targetDate && row.targetDate > today ? row.targetDate : today;

  return {
    loggedSeconds: focus.seconds,
    estimateMin,
    budgetHours: row.budgetHours,
    noEstimate: shaped.filter((entry) => !entry.estimateMin).length,
    points: from ? burndown(shaped, from, to, today) : [],
    ideal: row.startDate && row.targetDate ? { from: row.startDate, to: row.targetDate, hours: estimateMin / 60 } : null,
  };
}
