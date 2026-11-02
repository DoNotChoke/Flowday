import { and, asc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { category } from "@/lib/db/schema";
import { NotFoundError, parseInput, ValidationError } from "./errors";

const defaults = [
  { name: "Design", color: "#5b8def" },
  { name: "Development", color: "#4fc1be" },
  { name: "Coding", color: "#b9a5f2" },
  { name: "Meeting", color: "#ffc94a" },
  { name: "Research", color: "#f47258" },
  { name: "Office Time", color: "#d6d6d1" },
  { name: "User Experience", color: "#7fd3ce" },
];

const nameSchema = z.object({ name: z.string().trim().min(1, "Enter a name.").max(40) });

export function listCategories(userId: string) {
  return db.select().from(category).where(eq(category.userId, userId)).orderBy(asc(category.createdAt), asc(category.name));
}

export async function createCategory(userId: string, input: string) {
  const { name } = parseInput(nameSchema, { name: input });
  const existing = await listCategories(userId);
  if (existing.some((row) => row.name.toLowerCase() === name.toLowerCase())) {
    throw new ValidationError({ name: ["You already have this category."] });
  }

  const color = defaults[existing.length % defaults.length].color;
  const [row] = await db.insert(category).values({ userId, name, color }).returning();
  return row;
}

export async function renameCategory(userId: string, id: string, input: string) {
  const { name } = parseInput(nameSchema, { name: input });
  const others = await db
    .select({ name: category.name })
    .from(category)
    .where(and(eq(category.userId, userId), ne(category.id, id)));
  if (others.some((row) => row.name.toLowerCase() === name.toLowerCase())) {
    throw new ValidationError({ name: ["You already have this category."] });
  }

  const [row] = await db
    .update(category)
    .set({ name })
    .where(and(eq(category.id, id), eq(category.userId, userId)))
    .returning();
  if (!row) throw new NotFoundError("Category");
  return row;
}

export async function deleteCategory(userId: string, id: string) {
  const deleted = await db
    .delete(category)
    .where(and(eq(category.id, id), eq(category.userId, userId)))
    .returning({ id: category.id });
  if (deleted.length === 0) throw new NotFoundError("Category");
}

export async function seedCategories(userId: string) {
  await db.insert(category).values(defaults.map((row) => ({ ...row, userId }))).onConflictDoNothing();
}
