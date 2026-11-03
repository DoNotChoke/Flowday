"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clock, isRunning, remaining, type Durations } from "@/lib/focusTimer";
import { modeLabels, useFocusTimer } from "@/lib/useFocusTimer";

// Mounted once in the layout: it is the copy that rings and moves the timer on, on any page.
export function FocusAlarm({ minutes }: { minutes: Durations }) {
  useFocusTimer(minutes, true);
  return null;
}

// A started session, shown outside the Focus page so it stays in sight.
export function FocusPill({ compact = false }: { compact?: boolean }) {
  const { timer, now } = useFocusTimer();
  const pathname = usePathname();
  if (!timer || timer.startedAt === null || pathname === "/focus") return null;

  const left = clock(remaining(timer, now));
  const state = isRunning(timer) ? "" : " · Paused";

  return (
    <Link
      href="/focus"
      aria-label={`${modeLabels[timer.mode]}${state}, ${left} left. Open Focus mode`}
      className={`flex flex-none items-center gap-2 rounded-xl border-hard bg-sun font-semibold tabular-nums ${compact ? "h-11 px-3 text-sm" : "h-11 px-3.5 text-[13px]"}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 9v4l2.5 2M9 2h6M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" />
      </svg>
      {!compact && (
        <span className="min-w-0 flex-1 truncate">
          {modeLabels[timer.mode]}
          {state}
        </span>
      )}
      <span>{left}</span>
    </Link>
  );
}
