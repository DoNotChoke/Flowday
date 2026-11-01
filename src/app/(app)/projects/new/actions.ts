"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { ValidationError } from "@/services/errors";
import { createProject, type CreateProjectInput } from "@/services/projects";

export async function createProjectAction(input: CreateProjectInput) {
  const userId = await requireUserId();
  let id: string;
  try {
    ({ id } = await createProject(userId, input));
  } catch (error) {
    if (error instanceof ValidationError) return { fields: error.fields };
    throw error;
  }
  // The sidebar lives in the layout, which a redirect alone leaves as it was.
  revalidatePath("/", "layout");
  redirect(`/projects/${id}`);
}
