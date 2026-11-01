"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { authClient } from "@/lib/auth/client";
import { useHydrated } from "@/lib/useHydrated";

// Resolving against our origin rejects every off-site form, including //host and /\host.
function returnPath() {
  const next = new URLSearchParams(window.location.search).get("next") ?? "/tasks";
  const { origin } = window.location;
  const url = URL.parse(next, origin);
  return url?.origin === origin ? url.pathname + url.search : "/tasks";
}

function ArrivalNotice() {
  const query = useSearchParams();
  if (query.has("reset")) {
    return (
      <p role="status" className="rounded-control border-hard bg-teal-tint p-3.5 text-sm font-medium">
        Password changed. Sign in with your new password.
      </p>
    );
  }
  if (!query.has("verified")) return null;

  return query.has("error") ? (
    <p role="alert" className="text-sm font-medium text-danger">
      This link is invalid or has expired. Sign in and we will send you a new one.
    </p>
  ) : (
    <p role="status" className="rounded-control border-hard bg-teal-tint p-3.5 text-sm font-medium">
      Email verified. Sign in to continue.
    </p>
  );
}

export function SignInForm() {
  const hydrated = useHydrated();
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setPending(true);
    setError(undefined);

    const { data, error } = await authClient.signIn
      .email({
        email: String(values.get("email")),
        password: String(values.get("password")),
        rememberMe: values.get("remember") === "on",
      })
      .catch(() => ({ data: null, error: { code: undefined, message: undefined } }));

    // In an OAuth flow the auth client is already navigating to the consent page.
    if (data?.redirect) return;
    // A full load drops every client cache, which the new session makes stale.
    if (!error) return window.location.assign(returnPath());

    setPending(false);
    if (error.code === "EMAIL_NOT_VERIFIED") {
      setError("Verify your email first. We just sent you a new link.");
    } else {
      setError(error.message ?? "Could not reach Flowday. Check your connection and try again.");
    }
  }

  return (
    // method="post" is the backstop: if a submit ever slips through, the password stays out of the URL.
    <form method="post" onSubmit={submit} className="flex w-full max-w-110 flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[32px] font-bold tracking-[-0.8px]">Welcome back</h2>
        <p className="text-[15px] text-muted">Sign in to continue to your workspace.</p>
      </div>

      <Suspense>
        <ArrivalNotice />
      </Suspense>

      <Field label="Email" name="email" type="email" autoComplete="email" placeholder="you@gmail.com" required />
      <div className="relative">
        <Link href="/forgot-password" className="absolute top-0 right-0 text-[13px] font-medium underline hover:text-danger">
          Forgot password?
        </Link>
        <Field
          label="Password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="At least 8 characters"
          required
          className="pe-13"
        />
        <button
          type="button"
          aria-label={showPassword ? "Hide password" : "Show password"}
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-1 bottom-0.75 flex size-11 items-center justify-center"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
        <input type="checkbox" name="remember" defaultChecked className="size-4.5 accent-ink" />
        Keep me signed in for 30 days
      </label>

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending || !hydrated}>
        Sign in
      </Button>
      <p className="text-center text-sm text-muted">
        Don’t have an account?{" "}
        <Link href="/sign-up" className="font-semibold text-ink underline hover:text-danger">
          Create one
        </Link>
      </p>
    </form>
  );
}
