import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { jwt } from "better-auth/plugins";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

const baseURL = process.env.BETTER_AUTH_URL;
if (!baseURL) throw new Error("BETTER_AUTH_URL is not set. Copy .env.example to .env.");

export const mcpResource = `${baseURL}/api/mcp`;

function isAllowedEmail(email: string) {
  const allowed = (process.env.ALLOWED_EMAILS ?? "").split(",");
  return allowed.some((entry) => entry.trim().toLowerCase() === email.toLowerCase());
}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  // The jwt plugin's /token hands a session a JWT; tokens must only come from the OAuth flow.
  disabledPaths: ["/token"],
  emailAndPassword: { enabled: true },
  session: { expiresIn: 60 * 60 * 24 * 30 },
  user: {
    additionalFields: {
      timezone: { type: "string", required: false, defaultValue: "Asia/Ho_Chi_Minh", input: false },
    },
  },
  plugins: [
    jwt(),
    mcp({
      loginPage: "/sign-in",
      consentPage: "/oauth/consent",
      resource: mcpResource,
      scopes: ["openid", "profile", "offline_access", "tasks:read", "tasks:write"],
    }),
    cimd({ fetchClientMetadataResource, metadataProfile: "mcp-2026-07-28" }),
  ],
  // Runs for every way of creating a user, so OAuth sign-ups cannot bypass the list.
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!isAllowedEmail(user.email)) {
            throw new APIError("FORBIDDEN", { message: "This email is not allowed to sign up." });
          }
        },
      },
    },
  },
});
