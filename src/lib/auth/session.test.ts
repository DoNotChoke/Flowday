import { expect, test, vi } from "vitest";
import { requireUserId } from "@/lib/auth/session";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect to ${path}`);
  },
}));

test("without a session a Server Action goes to sign-in", async () => {
  await expect(requireUserId()).rejects.toThrow("redirect to /sign-in");
});
