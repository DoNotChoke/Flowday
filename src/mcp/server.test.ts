import { eq } from "drizzle-orm";
import { afterAll, beforeAll, expect, test } from "vitest";
import { POST } from "@/app/api/mcp/route";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { handleMcpRequest } from "./server";

const userId = "mcp-test-user";
const origin = process.env.BETTER_AUTH_URL;

function mcpRequest(body: object, headers: Record<string, string> = {}) {
  return new Request(`${origin}/api/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, ...body }),
  });
}

beforeAll(async () => {
  await db.insert(user).values({ id: userId, name: "Việt", email: "mcp-test@flowday.test" });
});

afterAll(async () => {
  await db.delete(user).where(eq(user.id, userId));
  await db.$client.end();
});

test("a request without a token gets the challenge Claude needs to start sign-in", async () => {
  const response = await POST(mcpRequest({ method: "tools/list" }));

  expect(response.status).toBe(401);
  const challenge = response.headers.get("www-authenticate");
  expect(challenge).toContain(`resource_metadata="${origin}/.well-known/oauth-protected-resource/api/mcp"`);
  expect(challenge).toContain('scope="tasks:read tasks:write"');
});

test("a made-up token is refused the same way", async () => {
  const response = await POST(mcpRequest({ method: "tools/list" }, { authorization: "Bearer made-up" }));

  expect(response.status).toBe(401);
});

test("a 2025-era client can initialize", async () => {
  const response = await handleMcpRequest(
    mcpRequest({
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0.0" },
      },
    }),
    userId,
  );

  expect(response.status).toBe(200);
  expect(await response.text()).toContain('"name":"flowday"');
});

test("a 2026-era client can discover the server", async () => {
  const response = await handleMcpRequest(
    mcpRequest(
      {
        method: "server/discover",
        params: {
          _meta: {
            "io.modelcontextprotocol/protocolVersion": "2026-07-28",
            "io.modelcontextprotocol/clientInfo": { name: "test", version: "1.0.0" },
            "io.modelcontextprotocol/clientCapabilities": {},
          },
        },
      },
      { "mcp-protocol-version": "2026-07-28", "mcp-method": "server/discover" },
    ),
    userId,
  );

  expect(response.status).toBe(200);
  expect(await response.text()).toContain('"name":"flowday"');
});

test("whoami answers with the signed-in user", async () => {
  const response = await handleMcpRequest(
    mcpRequest(
      { method: "tools/call", params: { name: "whoami", arguments: {} } },
      { "mcp-protocol-version": "2025-11-25" },
    ),
    userId,
  );

  expect(await response.text()).toContain("mcp-test@flowday.test");
});
