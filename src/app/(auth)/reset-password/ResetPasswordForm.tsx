"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { authClient } from "@/lib/auth/client";
import { useHydrated } from "@/lib/useHydrated";

const invalidLink = "This link is invalid or has expired.";

export function ResetPasswordForm() {
  const query = useSearchParams();
  const hydrated = useHydrated();
  const token = query.get("token");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(token ? undefined : invalidLink);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const newPassword = String(new FormData(event.currentTarget).get("password"));
    setPending(true);
    setError(undefined);

    const { error } = await authClient
      .resetPassword({ newPassword, token: token ?? "" })
      .catch(() => ({ error: { code: undefined, message: undefined } }));

    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (!error) return window.location.assign("/sign-in?reset=1");

    setPending(false);
    setError(
      error.code === "INVALID_TOKEN"
        ? invalidLink
        : (error.message ?? "Could not reach Flowday. Check your connection and try again."),
    );
  }

  return (
    <form method="post" onSubmit={submit} className="flex w-full max-w-110 flex-col gap-5">
      <h1 className="text-[32px] font-bold tracking-[-0.8px]">Choose a new password</h1>

      {token && (
        <Field label="New password" name="password" type="password" autoComplete="new-password" hint="Use 8 or more characters." required minLength={8} />
      )}

      {error && (
        <div role="alert" className="flex flex-col gap-1 text-sm font-medium text-danger">
          <p>{error}</p>
          {error === invalidLink && (
            <Link href="/forgot-password" className="font-semibold underline">
              Request a new link
            </Link>
          )}
        </div>
      )}

      {token && (
        <Button type="submit" disabled={pending || !hydrated}>
          Change password
        </Button>
      )}
    </form>
  );
}
