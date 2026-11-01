import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

function createServer(userId: string) {
  const server = new McpServer({ name: "flowday", version: "0.1.0" });

  server.registerTool(
    "whoami",
    {
      description: "Show the Flowday account this connection is signed in to.",
      annotations: { readOnlyHint: true },
    },
    async () => {
      const [account] = await db
        .select({ name: user.name, email: user.email, timezone: user.timezone })
        .from(user)
        .where(eq(user.id, userId));
      return { content: [{ type: "text", text: JSON.stringify(account) }] };
    },
  );

  return server;
}

// Keep the default legacy mode: Claude's connector docs still target the 2025 protocol.
export function handleMcpRequest(request: Request, userId: string) {
  return createMcpHandler(() => createServer(userId)).fetch(request);
}
