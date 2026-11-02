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
