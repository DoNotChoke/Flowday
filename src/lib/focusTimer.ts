// A Pomodoro timer as plain data. A running timer only stores when it ends, so a tab the
// browser slows down in the background still shows the right time when it wakes.

export type Mode = "focus" | "short" | "long";
export type Durations = Record<Mode, number>;

export const DEFAULT_MINUTES: Durations = { focus: 25, short: 5, long: 15 };
export const FOCUS_PER_LONG_BREAK = 4;
const MINUTE = 60_000;

export type Timer = {
  id: string;
  mode: Mode;
  durationMs: number;
  startedAt: number | null;
  endsAt: number | null;
  remainingMs: number;
  // Focus sessions finished since the last long break.
  focusCount: number;
};

export function idle(mode: Mode, minutes: Durations, focusCount = 0): Timer {
  const durationMs = minutes[mode] * MINUTE;
  return { id: crypto.randomUUID(), mode, durationMs, startedAt: null, endsAt: null, remainingMs: durationMs, focusCount };
}

export const remaining = (timer: Timer, now: number) => (timer.endsAt === null ? timer.remainingMs : Math.max(0, timer.endsAt - now));
export const elapsed = (timer: Timer, now: number) => timer.durationMs - remaining(timer, now);
export const isRunning = (timer: Timer) => timer.endsAt !== null;
export const isOver = (timer: Timer, now: number) => timer.endsAt !== null && now >= timer.endsAt;

export function start(timer: Timer, now: number): Timer {
  return { ...timer, startedAt: timer.startedAt ?? now, endsAt: now + timer.remainingMs };
}

export function pause(timer: Timer, now: number): Timer {
  return { ...timer, endsAt: null, remainingMs: remaining(timer, now) };
}

export function addMinutes(timer: Timer, minutes: number): Timer {
  const extra = minutes * MINUTE;
  return {
    ...timer,
    durationMs: timer.durationMs + extra,
    endsAt: timer.endsAt === null ? null : timer.endsAt + extra,
    remainingMs: timer.endsAt === null ? timer.remainingMs + extra : timer.remainingMs,
  };
}

export const reset = (timer: Timer, minutes: Durations) => idle(timer.mode, minutes, timer.focusCount);

// What comes after this timer, whether it ran out or was skipped.
export function next(timer: Timer, minutes: Durations): Timer {
  if (timer.mode !== "focus") return idle("focus", minutes, timer.mode === "long" ? 0 : timer.focusCount);
  const focusCount = timer.focusCount + 1;
  return idle(focusCount % FOCUS_PER_LONG_BREAK === 0 ? "long" : "short", minutes, focusCount);
}

export function clock(ms: number) {
  const seconds = Math.ceil(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
