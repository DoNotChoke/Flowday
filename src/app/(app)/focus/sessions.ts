import { elapsed, type Timer } from "@/lib/focusTimer";
import type { FocusSessionInput } from "@/services/focus";
import { recordSessionAction } from "./actions";

const PENDING = "flowday.focus.pending";
const MIN_SECONDS = 60;

const pending = (): FocusSessionInput[] => JSON.parse(localStorage.getItem(PENDING) ?? "[]");
const keep = (sessions: FocusSessionInput[]) => localStorage.setItem(PENDING, JSON.stringify(sessions));

let flushing = false;

// Sends what is waiting. A session the server refuses is dropped; one that could not reach it waits for the next try.
export async function flushSessions() {
  if (flushing) return;
  flushing = true;
  try {
    for (const session of pending()) {
      try {
        await recordSessionAction(session);
      } catch {
        break;
      }
      keep(pending().filter((waiting) => waiting.id !== session.id));
    }
  } finally {
    flushing = false;
  }
}

// Keeps the focus time of a timer that ran out, was skipped or was reset. Breaks and a minute or less are not kept.
export function finishSession(timer: Timer, endedAt: number, completed: boolean) {
  if (timer.mode !== "focus" || timer.startedAt === null) return;
  const seconds = Math.floor(elapsed(timer, endedAt) / 1000);
  if (!completed && seconds < MIN_SECONDS) return;
  keep([...pending(), { id: timer.id, taskId: timer.task?.id ?? null, mode: timer.mode, startedAt: timer.startedAt, endedAt, seconds, completed }]);
  void flushSessions();
}
