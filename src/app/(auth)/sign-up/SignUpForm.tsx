"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { authClient } from "@/lib/auth/client";

const strengthColors = ["bg-coral", "bg-sun", "bg-teal", "bg-heat-4"];
const strengthLabels = ["Weak password", "Okay — add a number or symbol", "Good password", "Strong password"];

const subscribeToNothing = () => () => {};

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

export function SignUpForm() {
  // A submit before hydration reloads the page and wipes the form, so the button waits.
  const hydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false);
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

    const { error } = await authClient.signUp
      .email({
        name: String(values.get("name")),
        email: String(values.get("email")),
        password: String(values.get("password")),
      })
      .catch(() => ({ error: { status: 0, code: undefined, message: undefined } }));

    // A full load: router.push could stall with the form stuck, and the session just changed anyway.
    if (!error) return window.location.assign("/tasks");

    setPending(false);
    if (error.status === 403 || error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
      setEmailError(error.message);
      (form.elements.namedItem("email") as HTMLInputElement).focus();
    } else {
      setFormError(error.message ?? "Could not reach Flowday. Check your connection and try again.");
    }
  }

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
    </form>
  );
}
