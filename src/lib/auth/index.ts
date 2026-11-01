import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

function isAllowedEmail(email: string) {
  const allowed = (process.env.ALLOWED_EMAILS ?? "").split(",");
  return allowed.some((entry) => entry.trim().toLowerCase() === email.toLowerCase());
}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      timezone: { type: "string", required: false, defaultValue: "Asia/Ho_Chi_Minh", input: false },
    },
  },
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
