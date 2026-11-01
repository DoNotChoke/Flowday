import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = { title: "Flowday — New password" };

export default function ResetPasswordPage() {
  return (
    <section className="flex flex-1 items-center justify-center px-2 py-6">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </section>
  );
}
