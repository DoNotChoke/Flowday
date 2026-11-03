import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUserId } from "@/lib/auth/session";
import { getTimerSettings } from "@/services/profile";
import { countFocusToday, getFocusQueue } from "@/services/focus";
import { getTask, getTimeZone } from "@/services/tasks";
import { Timer } from "./Timer";

export const metadata: Metadata = { title: "Flowday — Focus mode" };

async function LoadedTimer({ searchParams }: PageProps<"/focus">) {
  const userId = await requireUserId();
  const { task: taskId } = await searchParams;
  const [{ focusMin, shortBreakMin, longBreakMin }, task, timeZone] = await Promise.all([
    getTimerSettings(userId),
    typeof taskId === "string" ? getTask(userId, taskId) : null,
    getTimeZone(userId),
  ]);
  const [queue, focusedToday] = await Promise.all([getFocusQueue(userId, timeZone, focusMin), countFocusToday(userId, timeZone)]);
  return (
    <Timer
      minutes={{ focus: focusMin, short: shortBreakMin, long: longBreakMin }}
      chosen={task && { id: task.id, title: task.title }}
      queue={queue}
      focusedToday={focusedToday}
    />
  );
}

export default function FocusPage(props: PageProps<"/focus">) {
  return (
    <>
      <h1 className="sr-only">Focus mode</h1>
      <div className="flex flex-wrap items-start gap-6">
        <Suspense fallback={<div aria-hidden="true" className="h-[560px] min-w-0 flex-[3_1_460px] animate-pulse rounded-[28px] bg-panel motion-reduce:animate-none" />}>
          <LoadedTimer {...props} />
        </Suspense>
      </div>
    </>
  );
}
