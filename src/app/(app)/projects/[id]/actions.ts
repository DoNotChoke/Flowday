"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { ValidationError } from "@/services/errors";
import { addMilestone, deleteMilestone, updateMilestone, type MilestoneInput } from "@/services/milestones";
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

async function saveMilestone(work: (userId: string) => Promise<unknown>) {
  const userId = await requireUserId();
  try {
    await work(userId);
  } catch (error) {
    if (error instanceof ValidationError) return { fields: error.fields };
    throw error;
  }
  revalidatePath("/", "layout");
}

export async function addMilestoneAction(projectId: string, input: MilestoneInput) {
  return saveMilestone((userId) => addMilestone(userId, projectId, input));
}

export async function updateMilestoneAction(id: string, input: MilestoneInput) {
  return saveMilestone((userId) => updateMilestone(userId, id, input));
}

export async function deleteMilestoneAction(id: string) {
  return saveMilestone((userId) => deleteMilestone(userId, id));
}
