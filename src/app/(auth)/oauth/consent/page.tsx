import type { Metadata } from "next";
import { Suspense } from "react";
import { ConsentForm } from "./ConsentForm";

export const metadata: Metadata = { title: "Flowday — Allow access" };

export default function ConsentPage() {
  return (
    <section className="flex flex-1 items-center justify-center px-2 py-6">
      <Suspense>
        <ConsentForm />
      </Suspense>
    </section>
  );
}
