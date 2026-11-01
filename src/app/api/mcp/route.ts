import { requireMcpAuth } from "@better-auth/mcp";
import { auth, mcpResource } from "@/lib/auth";
import { handleMcpRequest } from "@/mcp/server";

const handler = requireMcpAuth(auth, (request, claims) => handleMcpRequest(request, String(claims.sub)), {
  resource: mcpResource,
  requiredScopes: ["tasks:read"],
  challengeScopes: ["tasks:read", "tasks:write"],
});

export { handler as GET, handler as POST };
