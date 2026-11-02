"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import { parseQuickAdd } from "@/lib/quickAdd";
import { listCategories } from "@/services/categories";
import { ValidationError } from "@/services/errors";
import { createTask, getTimeZone, moveTask, searchTasks, type MoveTaskInput } from "@/services/tasks";

export async function moveTaskAction(id: string, input: MoveTaskInput) {
  await moveTask(await requireUserId(), id, input);
  // The status cards and the sidebar count read the same rows.
  revalidatePath("/", "layout");
}

export async function searchTasksAction(query: string) {
  return searchTasks(await requireUserId(), query);
}

async function parseFor(userId: string, text: string) {
  const [categories, timeZone] = await Promise.all([listCategories(userId), getTimeZone(userId)]);
  const parsed = parseQuickAdd(text, { categories: categories.map((row) => row.name), now: new Date(), timeZone });
  return { parsed, categories };
}

export async function previewQuickAddAction(text: string) {
  return (await parseFor(await requireUserId(), text)).parsed;
}

export async function quickAddAction(text: string) {
  const userId = await requireUserId();
  const { parsed, categories } = await parseFor(userId, text);
  if (parsed.unknownCategories.length > 0) {
    return { fields: { category: [`No category named ${parsed.unknownCategories.join(", ")}. Create it first.`] } };
  }

  try {
    await createTask(userId, {
      title: parsed.title,
      dueDate: parsed.dueDate,
      dueTime: parsed.dueTime,
      priority: parsed.priority ?? undefined,
      categoryIds: categories.filter((row) => parsed.categories.includes(row.name)).map((row) => row.id),
    });
  } catch (error) {
    if (error instanceof ValidationError) return { fields: error.fields };
    throw error;
  }
  revalidatePath("/", "layout");
}
