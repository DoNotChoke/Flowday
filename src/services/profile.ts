import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { parseInput } from "./errors";

function isTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
  timezone: z.string().refine(isTimeZone, "Choose a time zone from the list."),
});

export type ProfileInput = z.input<typeof profileSchema>;

export async function getProfile(userId: string) {
  const [row] = await db.select({ name: user.name, email: user.email, timezone: user.timezone }).from(user).where(eq(user.id, userId));
  return row ?? null;
}

export async function updateProfile(userId: string, input: ProfileInput) {
  await db.update(user).set(parseInput(profileSchema, input)).where(eq(user.id, userId));
}

const timerSchema = z.object({
  focusMin: z.number().int().min(5, "Focus is 5 to 180 minutes.").max(180, "Focus is 5 to 180 minutes."),
  shortBreakMin: z.number().int().min(1, "A break is 1 to 60 minutes.").max(60, "A break is 1 to 60 minutes."),
  longBreakMin: z.number().int().min(1, "A break is 1 to 60 minutes.").max(60, "A break is 1 to 60 minutes."),
});

export type TimerSettings = z.infer<typeof timerSchema>;

export async function getTimerSettings(userId: string): Promise<TimerSettings> {
  const [row] = await db
    .select({ focusMin: user.focusMin, shortBreakMin: user.shortBreakMin, longBreakMin: user.longBreakMin })
    .from(user)
    .where(eq(user.id, userId));
  return row;
}

export async function updateTimerSettings(userId: string, input: TimerSettings) {
  await db.update(user).set(parseInput(timerSchema, input)).where(eq(user.id, userId));
}
