import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUserId } from "@/lib/auth/session";
import { getTimerSettings } from "@/services/profile";
import { Timer } from "./Timer";

export const metadata: Metadata = { title: "Flowday — Focus mode" };

async function LoadedTimer() {
  const { focusMin, shortBreakMin, longBreakMin } = await getTimerSettings(await requireUserId());
  return <Timer minutes={{ focus: focusMin, short: shortBreakMin, long: longBreakMin }} />;
}

export default function FocusPage() {
  return (
    <>
      <h1 className="sr-only">Focus mode</h1>
      <div className="flex flex-wrap items-start gap-6">
        <Suspense fallback={<div aria-hidden="true" className="h-[560px] min-w-0 flex-[3_1_460px] animate-pulse rounded-[28px] bg-panel motion-reduce:animate-none" />}>
          <LoadedTimer />
        </Suspense>
      </div>
    </>
  );
}
