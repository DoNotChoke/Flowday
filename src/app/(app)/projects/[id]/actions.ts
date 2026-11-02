"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { ValidationError } from "@/services/errors";
import { archiveProject, restoreProject, updateProject, type UpdateProjectInput } from "@/services/projects";

export async function updateProjectAction(id: string, input: UpdateProjectInput) {
  const userId = await requireUserId();
  try {
    await updateProject(userId, id, input);
  } catch (error) {
    if (error instanceof ValidationError) return { fields: error.fields };
    throw error;
  }
  // The sidebar lives in the layout, which a redirect alone leaves as it was.
  revalidatePath("/", "layout");
  redirect(`/projects/${id}`);
}

export async function archiveProjectAction(id: string) {
  await archiveProject(await requireUserId(), id);
  revalidatePath("/", "layout");
  redirect(`/projects/${id}`);
}

export async function restoreProjectAction(id: string) {
  await restoreProject(await requireUserId(), id);
  revalidatePath("/", "layout");
}
