"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { ValidationError } from "@/services/errors";
import { deleteTask, updateTask, type UpdateTaskInput } from "@/services/tasks";

export async function updateTaskAction(id: string, input: UpdateTaskInput) {
  const userId = await requireUserId();
  try {
    await updateTask(userId, id, input);
  } catch (error) {
    if (error instanceof ValidationError) return { fields: error.fields };
    throw error;
  }
  // The sidebar counts live in the layout.
  revalidatePath("/", "layout");
}

export async function deleteTaskAction(id: string) {
  await deleteTask(await requireUserId(), id);
  revalidatePath("/", "layout");
  redirect("/tasks");
}
