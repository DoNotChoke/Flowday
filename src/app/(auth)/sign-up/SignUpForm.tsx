"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { authClient } from "@/lib/auth/client";
import { useHydrated } from "@/lib/useHydrated";

const strengthColors = ["bg-coral", "bg-sun", "bg-teal", "bg-heat-4"];
const strengthLabels = ["Weak password", "Okay — add a number or symbol", "Good password", "Strong password"];

function passwordScore(password: string) {
  if (!password) return 0;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password) && /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  return Math.max(checks.filter(Boolean).length, 1);
}

function CheckEmail({ email }: { email: string }) {
  const [status, setStatus] = useState<string>();

  async function resend() {
    const { error } = await authClient
      .sendVerificationEmail({ email })
      .catch(() => ({ error: { message: undefined } }));
    setStatus(error ? (error.message ?? "Could not reach Flowday. Try again.") : "Sent. Check your inbox.");
  }

  return (
    <div className="flex w-full max-w-115 flex-col gap-4.5">
      <h1 className="text-[32px] font-bold tracking-[-0.8px]">Check your email</h1>
      <p className="text-[15px] text-muted">
        We sent a verification link to <span className="font-semibold break-all text-ink">{email}</span>. Open it to finish
        creating your account.
      </p>
      <Button variant="secondary" onClick={resend}>
        Send it again
      </Button>
      {status && (
        <p role="status" className="text-sm font-medium">
          {status}
        </p>
      )}
      <Link href="/sign-in" className="text-center text-sm font-semibold underline hover:text-danger">
        Back to sign in
      </Link>
    </div>
  );
}

export function SignUpForm() {
  const hydrated = useHydrated();
  const [sentTo, setSentTo] = useState<string>();
  const [score, setScore] = useState(0);
  const [pending, setPending] = useState(false);
  const [emailError, setEmailError] = useState<string>();
  const [formError, setFormError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setPending(true);
    setEmailError(undefined);
    setFormError(undefined);

    const email = String(values.get("email"));
    const { error } = await authClient.signUp
      .email({ name: String(values.get("name")), email, password: String(values.get("password")) })
      .catch(() => ({ error: { code: undefined, message: undefined } }));

    if (!error) return setSentTo(email);

    setPending(false);
    if (error.code === "EMAIL_NOT_ALLOWED") {
      setEmailError(error.message);
      (form.elements.namedItem("email") as HTMLInputElement).focus();
    } else {
      setFormError(error.message ?? "Could not reach Flowday. Check your connection and try again.");
    }
  }

  if (sentTo) return <CheckEmail email={sentTo} />;

  return (
    // method="post" is the backstop: if a submit ever slips through, the password stays out of the URL.
    <form method="post" onSubmit={submit} className="flex w-full max-w-115 flex-col gap-4.5">
      <div className="mb-2 flex items-center gap-2.5">
        <span className="flex size-9.5 items-center justify-center rounded-[11px] bg-ink">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-sun)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        <span className="text-xl font-bold">Flowday</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[32px] font-bold tracking-[-0.8px]">Create your account</h1>
        <p className="text-[15px] text-muted">Free forever for personal use. No credit card.</p>
      </div>

      <Field label="Full name" name="name" autoComplete="name" placeholder="Your name" required className="font-content" />
      <Field label="Email" name="email" type="email" autoComplete="email" placeholder="you@gmail.com" required error={emailError} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="Type to see strength"
        required
        minLength={8}
        onChange={(event) => setScore(passwordScore(event.target.value))}
        hint={strengthLabels[score - 1] ?? "Use 8+ characters with a mix of letters, numbers & symbols"}
        meter={
          <div className="mt-1 grid grid-cols-4 gap-1.5" aria-hidden="true">
            {strengthColors.map((color, index) => (
              <span key={color} className={`h-1.5 rounded ${index < score ? strengthColors[score - 1] : "bg-[#deded9]"}`} />
            ))}
          </div>
        }
      />

      {formError && (
        <p role="alert" className="text-sm font-medium text-danger">
          {formError}
        </p>
      )}

      <Button type="submit" disabled={pending || !hydrated}>
        Create account
      </Button>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-ink underline hover:text-danger">
          Sign in
        </Link>
      </p>
    </form>
  );
}
