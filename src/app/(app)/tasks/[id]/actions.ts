"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { addComment } from "@/services/activity";
import { ValidationError } from "@/services/errors";
import { addSubtask, deleteSubtask, moveSubtask, renameSubtask, setSubtaskDone } from "@/services/subtasks";
import { deleteTask, updateTask, type UpdateTaskInput } from "@/services/tasks";

async function save(work: (userId: string) => Promise<unknown>) {
  const userId = await requireUserId();
  try {
    await work(userId);
  } catch (error) {
    if (error instanceof ValidationError) return { fields: error.fields };
    throw error;
  }
  // The sidebar counts live in the layout.
  revalidatePath("/", "layout");
}

export async function updateTaskAction(id: string, input: UpdateTaskInput) {
  return save((userId) => updateTask(userId, id, input));
}

export async function addCommentAction(taskId: string, body: string) {
  return save((userId) => addComment(userId, taskId, body));
}

export async function addSubtaskAction(taskId: string, title: string) {
  return save((userId) => addSubtask(userId, taskId, title));
}

export async function setSubtaskDoneAction(id: string, done: boolean) {
  return save((userId) => setSubtaskDone(userId, id, done));
}

export async function renameSubtaskAction(id: string, title: string) {
  return save((userId) => renameSubtask(userId, id, title));
}

export async function moveSubtaskAction(id: string, afterId: string | null) {
  return save((userId) => moveSubtask(userId, id, afterId));
}

export async function deleteSubtaskAction(id: string) {
  return save((userId) => deleteSubtask(userId, id));
}

export async function deleteTaskAction(id: string) {
  await deleteTask(await requireUserId(), id);
  revalidatePath("/", "layout");
  redirect("/tasks");
}
