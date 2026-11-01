import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { oauthClient, oauthClientResource, oauthResource, user } from "@/lib/db/schema";

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

export async function deleteUser(email: string) {
  await db.delete(user).where(eq(user.email, email));
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => {
    const { scrollWidth, clientWidth } = document.documentElement;
    return scrollWidth - clientWidth;
  });
  expect(overflow, "page scrolls horizontally").toBeLessThanOrEqual(0);
}
