"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import { deleteCategory, renameCategory } from "@/services/categories";
import { ValidationError } from "@/services/errors";
import { updateProfile, type ProfileInput } from "@/services/profile";

async function save(work: (userId: string) => Promise<unknown>) {
  const userId = await requireUserId();
  try {
    await work(userId);
  } catch (error) {
    if (error instanceof ValidationError) return { fields: error.fields };
    throw error;
  }
  revalidatePath("/", "layout");
}

export async function updateProfileAction(input: ProfileInput) {
  return save((userId) => updateProfile(userId, input));
}

export async function renameCategoryAction(id: string, name: string) {
  return save((userId) => renameCategory(userId, id, name));
}

export async function deleteCategoryAction(id: string) {
  return save((userId) => deleteCategory(userId, id));
}
