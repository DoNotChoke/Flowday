import { and, count, eq, isNull, like, asc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { project, task } from "@/lib/db/schema";
import { projectColors, projectIcons, projectKey, projectTemplates } from "@/lib/projects";
import { parseInput } from "./errors";
import { endOfColumn, POSITION_GAP } from "./tasks";

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
  })
  .refine(({ startDate, targetDate }) => !startDate || !targetDate || targetDate >= startDate, {
    path: ["targetDate"],
    message: "The end date must come after the start date.",
  });

export type CreateProjectInput = z.input<typeof createSchema>;

export async function createProject(userId: string, input: CreateProjectInput) {
  const values = parseInput(createSchema, input);
  const base = projectKey(values.name);
  const starter = projectTemplates.find((template) => template.id === values.template)?.starter ?? [];

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
    await tx.insert(task).values(
      starter.map((title, index) => ({
        userId,
        title,
        projectId: row.id,
        number: index + 1,
        position: start + index * POSITION_GAP,
      })),
    );
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

export function listProjects(userId: string) {
  return db
    .select({ id: project.id, name: project.name, color: project.color, taskCount: count(task.id) })
    .from(project)
    .leftJoin(task, eq(task.projectId, project.id))
    .where(and(eq(project.userId, userId), isNull(project.archivedAt)))
    .groupBy(project.id)
    .orderBy(asc(project.createdAt));
}
