import { eq } from "drizzle-orm";
import { afterAll, beforeAll, expect, test } from "vitest";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { getBoard } from "./board";
import { ValidationError } from "./errors";
import { getProfile, updateProfile } from "./profile";

const alice = "profile-test-alice";

beforeAll(async () => {
  await db.insert(user).values({ id: alice, name: "Alice", email: "profile-alice@flowday.test" });
});

afterAll(async () => {
  await db.delete(user).where(eq(user.id, alice));
  await db.$client.end();
});

test("the name and the time zone are saved, and the name is trimmed", async () => {
  await updateProfile(alice, { name: "  Việt  ", timezone: "Asia/Tokyo" });

  expect(await getProfile(alice)).toEqual({ name: "Việt", email: "profile-alice@flowday.test", timezone: "Asia/Tokyo" });
});

test("a blank name or an unknown zone is refused", async () => {
  await expect(updateProfile(alice, { name: "   ", timezone: "Asia/Tokyo" })).rejects.toBeInstanceOf(ValidationError);
  await expect(updateProfile(alice, { name: "Alice", timezone: "Mars/Olympus" })).rejects.toBeInstanceOf(ValidationError);

  expect((await getProfile(alice))?.timezone).toBe("Asia/Tokyo");
});

test("changing the zone moves what counts as today", async () => {
  await updateProfile(alice, { name: "Alice", timezone: "Pacific/Kiritimati" }); // UTC+14
  const ahead = await getBoard(alice);

  await updateProfile(alice, { name: "Alice", timezone: "Pacific/Pago_Pago" }); // UTC-11, always a different day

  expect((await getBoard(alice)).dateLabel).not.toBe(ahead.dateLabel);
});
