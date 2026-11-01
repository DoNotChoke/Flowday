import { afterAll, expect, test } from "vitest";
import { GET as authorizationServer } from "@/app/.well-known/oauth-authorization-server/api/auth/route";
import { GET as protectedResource } from "@/app/.well-known/oauth-protected-resource/api/mcp/route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const origin = process.env.BETTER_AUTH_URL;

afterAll(() => db.$client.end());

async function resourceMetadata() {
  const response = await protectedResource(new Request(`${origin}/.well-known/oauth-protected-resource/api/mcp`));
  expect(response.status).toBe(200);
  return response.json();
}

async function serverMetadata() {
  const response = await authorizationServer(new Request(`${origin}/.well-known/oauth-authorization-server/api/auth`));
  expect(response.status).toBe(200);
  return response.json();
}

test("the resource is the exact URL people give Claude", async () => {
  expect((await resourceMetadata()).resource).toBe(`${origin}/api/mcp`);
});

test("the issuer comes first in the authorization servers", async () => {
  expect((await resourceMetadata()).authorization_servers[0]).toBe(`${origin}/api/auth`);
});

test("the resource advertises the task scopes", async () => {
  expect((await resourceMetadata()).scopes_supported).toEqual(["tasks:read", "tasks:write"]);
});

test("the server advertises what makes Claude choose CIMD", async () => {
  const metadata = await serverMetadata();

  expect(metadata.client_id_metadata_document_supported).toBe(true);
  expect(metadata.token_endpoint_auth_methods_supported).toContain("none");
});

test("the server requires S256 PKCE", async () => {
  expect((await serverMetadata()).code_challenge_methods_supported).toEqual(["S256"]);
});

test("offline_access is listed so Claude asks for a refresh token", async () => {
  expect((await serverMetadata()).scopes_supported).toContain("offline_access");
});

test("a browser session cannot mint a JWT outside the OAuth flow", async () => {
  const response = await auth.handler(new Request(`${origin}/api/auth/token`));

  expect(response.status).toBe(404);
});

test("anonymous client registration stays closed", async () => {
  expect(await serverMetadata()).not.toHaveProperty("registration_endpoint");
});
