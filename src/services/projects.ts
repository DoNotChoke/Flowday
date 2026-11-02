import { and, count, eq, isNull, like, asc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { utcToZoned } from "@/lib/datetime";
import { activity, project, task } from "@/lib/db/schema";
import { projectColors, projectIcons, projectKey, projectTemplates } from "@/lib/projects";
import { parseInput } from "./errors";
import { endOfColumn, getTimeZone, POSITION_GAP } from "./tasks";

const createSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a project name.").max(80),
    description: z.string().max(10_000).nullable().optional(),
    color: z.enum(projectColors.map((color) => color.hex)),
    icon: z.enum(projectIcons.map((icon) => icon.name)),
    template: z.enum(projectTemplates.map((template) => template.id)),
    startDate: z.iso.date().nullable().optional(),
    targetDate: z.iso.date().nullable().optional(),
    budgetHours: z.number().int().min(0).max(100_000).nullable().optional(),
    withStarterTasks: z.boolean().default(true),
  })
  .refine(({ startDate, targetDate }) => !startDate || !targetDate || targetDate >= startDate, {
    path: ["targetDate"],
    message: "The end date must come after the start date.",
  });

export type CreateProjectInput = z.input<typeof createSchema>;

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

export function listProjects(userId: string) {
  return db
    .select({ id: project.id, name: project.name, color: project.color, taskCount: count(task.id) })
    .from(project)
    .leftJoin(task, eq(task.projectId, project.id))
    .where(and(eq(project.userId, userId), isNull(project.archivedAt)))
    .groupBy(project.id)
    .orderBy(asc(project.createdAt));
}
