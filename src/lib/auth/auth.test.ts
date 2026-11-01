import { eq } from "drizzle-orm";
import { afterAll, afterEach, expect, test, vi } from "vitest";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

const password = "correct-horse-battery";

function userRows(email: string) {
  return db.select().from(user).where(eq(user.email, email));
}

afterEach(async () => {
  vi.unstubAllEnvs();
  await db.delete(user).where(eq(user.email, "owner@flowday.test"));
  await db.delete(user).where(eq(user.email, "stranger@flowday.test"));
});

afterAll(() => db.$client.end());

test("an allowed email signs up with the default timezone, ignoring case", async () => {
  vi.stubEnv("ALLOWED_EMAILS", " OWNER@flowday.test , other@flowday.test");

  await auth.api.signUpEmail({
    body: { name: "Owner", email: "Owner@Flowday.test", password },
  });

  const [row] = await userRows("owner@flowday.test");
  expect(row.timezone).toBe("Asia/Ho_Chi_Minh");
});

test("an email outside the list is rejected and leaves no row", async () => {
  vi.stubEnv("ALLOWED_EMAILS", "owner@flowday.test");

  await expect(
    auth.api.signUpEmail({
      body: { name: "Stranger", email: "stranger@flowday.test", password },
    }),
  ).rejects.toThrow("not allowed");

  expect(await userRows("stranger@flowday.test")).toHaveLength(0);
});

test("an empty list rejects every sign-up", async () => {
  vi.stubEnv("ALLOWED_EMAILS", "");

  await expect(
    auth.api.signUpEmail({
      body: { name: "Owner", email: "owner@flowday.test", password },
    }),
  ).rejects.toThrow("not allowed");

  expect(await userRows("owner@flowday.test")).toHaveLength(0);
});
