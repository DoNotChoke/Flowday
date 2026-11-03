"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import { NotFoundError, ValidationError } from "@/services/errors";
import { recordSession, type FocusSessionInput } from "@/services/focus";
import { updateTimerSettings, type TimerSettings } from "@/services/profile";

async function save(work: (userId: string) => Promise<unknown>, path: string) {
  const userId = await requireUserId();
  try {
    await work(userId);
  } catch (error) {
    if (error instanceof ValidationError) return { fields: error.fields };
    // A task deleted meanwhile: report it rather than fail, so the browser stops resending.
    if (error instanceof NotFoundError) return { fields: { form: [error.message] } };
    throw error;
  }
  revalidatePath(path, "layout");
}

export async function updateTimerSettingsAction(input: TimerSettings) {
  return save((userId) => updateTimerSettings(userId, input), "/focus");
}

export async function recordSessionAction(input: FocusSessionInput) {
  // Time tracked shows on the task's page.
  return save((userId) => recordSession(userId, input), "/");
}
