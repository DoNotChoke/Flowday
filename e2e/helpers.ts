import { randomInt, randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { oauthClient, oauthClientResource, oauthResource, project, task, user, verification } from "@/lib/db/schema";

export async function createOAuthClient(redirectUri: string) {
  const clientId = randomUUID();
  await db.insert(oauthClient).values({
    id: clientId,
    clientId,
    name: "E2E Client",
    redirectUris: [redirectUri],
    tokenEndpointAuthMethod: "none",
    applicationType: "native",
    grantTypes: ["authorization_code", "refresh_token"],
    responseTypes: ["code"],
    requirePKCE: true,
  });
  const identifier = `${process.env.BETTER_AUTH_URL}/api/mcp`;
  await db.insert(oauthResource).values({ id: identifier, identifier, name: "Flowday MCP" }).onConflictDoNothing();
  await db.insert(oauthClientResource).values({ id: clientId, clientId, resourceId: identifier });
  return clientId;
}

export async function deleteOAuthClient(clientId: string) {
  await db.delete(oauthClient).where(eq(oauthClient.clientId, clientId));
}

export async function verifyEmail(email: string) {
  await db.update(user).set({ emailVerified: true }).where(eq(user.email, email));
}

// Reads the token of the reset link that would have gone out by mail.
export async function resetTokenFor(email: string) {
  const [row] = await db
    .select({ identifier: verification.identifier })
    .from(verification)
    .innerJoin(user, eq(verification.value, user.id))
    .where(eq(user.email, email));
  return row.identifier.replace("reset-password:", "");
}

export async function createProjects(email: string, names: string[]) {
  const [owner] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  await db.insert(project).values(
    names.map((name, index) => ({ userId: owner.id, name, key: `K${index}`, color: "#f47258", icon: "code" })),
  );
}

export async function signInNewUser(page: Page, email: string) {
  const password = "correct-horse-battery";
  const headers = { "x-forwarded-for": `10.${randomInt(256)}.${randomInt(256)}.${randomInt(256)}` };
  await page.request.post("/api/auth/sign-up/email", { data: { name: "Việt", email, password }, headers });
  await verifyEmail(email);
  await page.request.post("/api/auth/sign-in/email", { data: { email, password }, headers });
}

export function tasksOf(email: string) {
  return db
    .select({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      estimateMin: task.estimateMin,
      number: task.number,
      dueAt: task.dueAt,
    })
    .from(task)
    .innerJoin(user, eq(task.userId, user.id))
    .where(eq(user.email, email));
}

export async function deleteUser(email: string) {
  await db.delete(user).where(eq(user.email, email));
}

// The message can last a single frame, so it is caught as it enters the page.
export async function watchForUnreachable(page: Page) {
  await page.evaluate(() => {
    new MutationObserver(() => {
      if (document.body.textContent?.includes("Could not reach")) document.documentElement.dataset.unreachable = "shown";
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  });
}

export async function expectNoUnreachableFlash(page: Page) {
  await expect(page.locator("html")).not.toHaveAttribute("data-unreachable");
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => {
    const { scrollWidth, clientWidth } = document.documentElement;
    return scrollWidth - clientWidth;
  });
  expect(overflow, "page scrolls horizontally").toBeLessThanOrEqual(0);
}

export async function completeTask(email: string, title: string) {
  const [owner] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  await db.update(task).set({ status: "completed" }).where(and(eq(task.userId, owner.id), eq(task.title, title)));
}

export async function archiveProjects(email: string) {
  const [owner] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  await db.update(project).set({ archivedAt: new Date() }).where(eq(project.userId, owner.id));
}
