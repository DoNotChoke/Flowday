import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { jwt } from "better-auth/plugins";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { sendMail } from "@/lib/mail";

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
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: "Reset your Flowday password",
        text: `Open this link to choose a new password: ${url}`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    sendVerificationEmail: async ({ user, url }) => {
      // One landing page for every link, so sign-in stays free to choose its own redirect.
      const link = new URL(url);
      link.searchParams.set("callbackURL", "/sign-in?verified=1");
      await sendMail({
        to: user.email,
        subject: "Verify your Flowday email",
        text: `Open this link to verify your email: ${link}`,
      });
    },
  },
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
            // Not 403: with email verification on, sign-up swallows that status into a fake success.
            throw new APIError("UNPROCESSABLE_ENTITY", {
              code: "EMAIL_NOT_ALLOWED",
              message: "This email is not allowed to sign up.",
            });
          }
        },
      },
    },
  },
});
