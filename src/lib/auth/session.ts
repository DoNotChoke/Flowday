import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/lib/auth";

export async function getCurrentUser() {
  "use cache: private";

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const { id, name, email } = session.user;
  return { id, name, email };
}

// For Server Actions and anything reading the DB. getCurrentUser() may answer from the browser cache, which
// must not authorize a write. connection() keeps the caller out of prefetching, where queries are not allowed.
export async function requireUserId() {
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  return session.user.id;
}
