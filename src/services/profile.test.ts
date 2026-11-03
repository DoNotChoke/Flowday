import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, expect, test } from "vitest";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { getBoard } from "./board";
import { ValidationError } from "./errors";
import { getProfile, getTimerSettings, updateProfile, updateTimerSettings } from "./profile";

const alice = "profile-test-alice";
const bob = "profile-test-bob";

beforeAll(async () => {
  await db.insert(user).values([
    { id: alice, name: "Alice", email: "profile-alice@flowday.test" },
    { id: bob, name: "Bob", email: "profile-bob@flowday.test" },
  ]);
});

afterAll(async () => {
  await db.delete(user).where(inArray(user.id, [alice, bob]));
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

test("a new account times 25, 5 and 15 minutes", async () => {
  expect(await getTimerSettings(bob)).toEqual({ focusMin: 25, shortBreakMin: 5, longBreakMin: 15 });
});

test("timer lengths are saved for that account only", async () => {
  await updateTimerSettings(alice, { focusMin: 50, shortBreakMin: 10, longBreakMin: 30 });

  expect(await getTimerSettings(alice)).toEqual({ focusMin: 50, shortBreakMin: 10, longBreakMin: 30 });
  expect(await getTimerSettings(bob)).toEqual({ focusMin: 25, shortBreakMin: 5, longBreakMin: 15 });
});

test.each([
  [{ focusMin: 4, shortBreakMin: 5, longBreakMin: 15 }, "focusMin"],
  [{ focusMin: 181, shortBreakMin: 5, longBreakMin: 15 }, "focusMin"],
  [{ focusMin: 25, shortBreakMin: 0, longBreakMin: 15 }, "shortBreakMin"],
  [{ focusMin: 25, shortBreakMin: 5, longBreakMin: 61 }, "longBreakMin"],
  [{ focusMin: 25.5, shortBreakMin: 5, longBreakMin: 15 }, "focusMin"],
])("%o is refused at %s", async (input, field) => {
  const error = await updateTimerSettings(alice, input).catch((caught) => caught);

  expect(error).toBeInstanceOf(ValidationError);
  expect(Object.keys(error.fields)).toEqual([field]);
});
