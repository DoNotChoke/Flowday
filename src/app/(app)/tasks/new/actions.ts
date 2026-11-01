"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { projectColors, projectIcons } from "@/lib/projects";
import { createCategory } from "@/services/categories";
import { ValidationError } from "@/services/errors";
import { createProject } from "@/services/projects";
import { createTask, type CreateTaskInput } from "@/services/tasks";

function fieldErrors(error: unknown) {
  if (error instanceof ValidationError) return { fields: error.fields };
  throw error;
}

export async function createTaskAction(input: CreateTaskInput) {
  const userId = await requireUserId();
  try {
    await createTask(userId, input);
  } catch (error) {
    return fieldErrors(error);
  }
  // The sidebar counts live in the layout, which a redirect alone leaves as it was.
  revalidatePath("/", "layout");
  redirect("/tasks");
}

export async function createCategoryAction(name: string) {
  const userId = await requireUserId();
  try {
    return { category: await createCategory(userId, name) };
  } catch (error) {
    return fieldErrors(error);
  }
}

export async function createProjectAction(name: string) {
  const userId = await requireUserId();
  try {
    const project = await createProject(userId, {
      name,
      color: projectColors[0].hex,
      icon: projectIcons[0].name,
      template: "blank",
      withStarterTasks: false,
    });
    revalidatePath("/", "layout");
    return { project: { id: project.id, name: project.name, color: project.color } };
  } catch (error) {
    return fieldErrors(error);
  }
}
