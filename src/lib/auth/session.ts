import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function getCurrentUser() {
  "use cache: private";

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const { id, name, email } = session.user;
  return { id, name, email };
}

// For Server Actions: getCurrentUser() may answer from the browser cache, which must not authorize a write.
export async function requireUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  return session.user.id;
}
