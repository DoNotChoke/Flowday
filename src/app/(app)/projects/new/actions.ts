"use server";

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
  redirect(`/projects/${id}`);
}
