"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { authClient } from "@/lib/auth/client";
import { useHydrated } from "@/lib/useHydrated";

export default function ForgotPasswordPage() {
  const hydrated = useHydrated();
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email"));
    setPending(true);
    setError(undefined);

    const { error } = await authClient
      .requestPasswordReset({ email, redirectTo: "/reset-password" })
      .catch(() => ({ error: { message: undefined } }));

    setPending(false);
    if (error) setError(error.message ?? "Could not reach Flowday. Check your connection and try again.");
    else setSent(true);
  }

  return (
    <section className="flex flex-1 items-center justify-center px-2 py-6">
      <form method="post" onSubmit={submit} className="flex w-full max-w-110 flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[32px] font-bold tracking-[-0.8px]">Reset your password</h1>
          <p className="text-[15px] text-muted">Enter your email and we will send you a link.</p>
        </div>

        <Field label="Email" name="email" type="email" autoComplete="email" placeholder="you@gmail.com" required />

        {sent && (
          <p role="status" className="rounded-control border-hard bg-teal-tint p-3.5 text-sm font-medium">
            If that email has an account, a reset link is on its way.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        )}

        <Button type="submit" disabled={pending || !hydrated}>
          Send reset link
        </Button>
        <Link href="/sign-in" className="text-center text-sm font-semibold underline hover:text-danger">
          Back to sign in
        </Link>
      </form>
    </section>
  );
}
