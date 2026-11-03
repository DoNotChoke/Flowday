"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import { ValidationError } from "@/services/errors";
import { updateTimerSettings, type TimerSettings } from "@/services/profile";

export async function updateTimerSettingsAction(input: TimerSettings) {
  const userId = await requireUserId();
  try {
    await updateTimerSettings(userId, input);
  } catch (error) {
    if (error instanceof ValidationError) return { fields: error.fields };
    throw error;
  }
  revalidatePath("/focus");
}
