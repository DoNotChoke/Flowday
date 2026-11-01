"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import { moveTask, type MoveTaskInput } from "@/services/tasks";

export async function moveTaskAction(id: string, input: MoveTaskInput) {
  await moveTask(await requireUserId(), id, input);
  // The status cards and the sidebar count read the same rows.
  revalidatePath("/", "layout");
}
