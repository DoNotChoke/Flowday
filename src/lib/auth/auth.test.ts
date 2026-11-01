import { eq } from "drizzle-orm";
import { afterAll, afterEach, expect, test, vi } from "vitest";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { session, user } from "@/lib/db/schema";
import { sendMail } from "@/lib/mail";

vi.mock("@/lib/mail", () => ({ sendMail: vi.fn() }));

const password = "correct-horse-battery";

function userRows(email: string) {
  return db.select().from(user).where(eq(user.email, email));
}

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.mocked(sendMail).mockClear();
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

function verificationLink() {
  const { text } = vi.mocked(sendMail).mock.lastCall![0];
  return new URL(text.match(/https?:\S+/)![0]);
}

async function signUpOwner() {
  vi.stubEnv("ALLOWED_EMAILS", "owner@flowday.test");
  await auth.api.signUpEmail({ body: { name: "Owner", email: "owner@flowday.test", password } });
}

function signInOwner() {
  return auth.api.signInEmail({ body: { email: "owner@flowday.test", password } });
}

test("signing up mails a link and does not open a session", async () => {
  await signUpOwner();

  expect(vi.mocked(sendMail).mock.lastCall![0].to).toBe("owner@flowday.test");
  await expect(signInOwner()).rejects.toThrow("not verified");
});

test("a sign-in before verifying sends a fresh link", async () => {
  await signUpOwner();
  vi.mocked(sendMail).mockClear();

  await signInOwner().catch(() => {});

  expect(sendMail).toHaveBeenCalledOnce();
});

test("the link verifies the email and lands on the sign-in page", async () => {
  await signUpOwner();

  const response = await auth.handler(new Request(verificationLink()));

  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe("/sign-in?verified=1");
  await expect(signInOwner()).resolves.toMatchObject({ user: { email: "owner@flowday.test" } });
});

test("a tampered link verifies nothing and says so", async () => {
  await signUpOwner();
  const link = verificationLink();
  link.searchParams.set("token", `${link.searchParams.get("token")}x`);

  const response = await auth.handler(new Request(link));

  expect(response.headers.get("location")).toContain("error=INVALID_TOKEN");
  await expect(signInOwner()).rejects.toThrow("not verified");
});

async function verifiedOwner() {
  await signUpOwner();
  await db.update(user).set({ emailVerified: true }).where(eq(user.email, "owner@flowday.test"));
  vi.mocked(sendMail).mockClear();
}

async function resetToken() {
  await auth.api.requestPasswordReset({ body: { email: "owner@flowday.test", redirectTo: "/reset-password" } });
  return verificationLink().pathname.split("/").pop()!;
}

test("a reset link changes the password and the old one stops working", async () => {
  await verifiedOwner();

  await auth.api.resetPassword({ body: { token: await resetToken(), newPassword: "a-brand-new-password" } });

  await expect(signInOwner()).rejects.toThrow("Invalid email or password");
  await expect(
    auth.api.signInEmail({ body: { email: "owner@flowday.test", password: "a-brand-new-password" } }),
  ).resolves.toMatchObject({ user: { email: "owner@flowday.test" } });
});

test("a reset link works only once", async () => {
  await verifiedOwner();
  const token = await resetToken();
  await auth.api.resetPassword({ body: { token, newPassword: "a-brand-new-password" } });

  await expect(auth.api.resetPassword({ body: { token, newPassword: "another-new-password" } })).rejects.toThrow("Invalid token");
});

test("an unknown email gets the same answer and no mail", async () => {
  await verifiedOwner();

  const known = await auth.api.requestPasswordReset({ body: { email: "owner@flowday.test", redirectTo: "/reset-password" } });
  vi.mocked(sendMail).mockClear();
  const unknown = await auth.api.requestPasswordReset({ body: { email: "nobody@flowday.test", redirectTo: "/reset-password" } });

  expect(unknown).toEqual(known);
  expect(sendMail).not.toHaveBeenCalled();
});

test("changing the password signs out every other device", async () => {
  await verifiedOwner();
  const { token: sessionToken } = await signInOwner();

  await auth.api.resetPassword({ body: { token: await resetToken(), newPassword: "a-brand-new-password" } });

  const rows = await db.select().from(session).where(eq(session.token, sessionToken));
  expect(rows).toHaveLength(0);
});
