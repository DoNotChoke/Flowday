import { expect, test } from "vitest";
import { addMinutes, clock, DEFAULT_MINUTES, elapsed, idle, isOver, isRunning, next, pause, remaining, reset, start } from "@/lib/focusTimer";

const MINUTE = 60_000;
const t0 = Date.parse("2026-11-03T09:00:00Z");

test("a new timer waits with the full length", () => {
  const timer = idle("focus", DEFAULT_MINUTES);
  expect(remaining(timer, t0)).toBe(25 * MINUTE);
  expect(isRunning(timer)).toBe(false);
  expect(timer.startedAt).toBeNull();
});

test("a running timer counts from when it ends, however rarely it is looked at", () => {
  const timer = start(idle("focus", DEFAULT_MINUTES), t0);
  expect(remaining(timer, t0 + 5 * MINUTE)).toBe(20 * MINUTE);
  expect(remaining(timer, t0 + 30 * MINUTE)).toBe(0);
  expect(isOver(timer, t0 + 25 * MINUTE - 1)).toBe(false);
  expect(isOver(timer, t0 + 25 * MINUTE)).toBe(true);
});

test("pause keeps what is left, and resuming continues from there", () => {
  const paused = pause(start(idle("focus", DEFAULT_MINUTES), t0), t0 + 10 * MINUTE);
  expect(isRunning(paused)).toBe(false);
  expect(remaining(paused, t0 + 60 * MINUTE)).toBe(15 * MINUTE);
  expect(isOver(paused, t0 + 60 * MINUTE)).toBe(false);

  const resumed = start(paused, t0 + 60 * MINUTE);
  expect(resumed.startedAt).toBe(t0);
  expect(remaining(resumed, t0 + 65 * MINUTE)).toBe(10 * MINUTE);
  expect(elapsed(resumed, t0 + 65 * MINUTE)).toBe(15 * MINUTE);
});

test("+5 min adds to a running or a paused timer", () => {
  const running = addMinutes(start(idle("focus", DEFAULT_MINUTES), t0), 5);
  expect(remaining(running, t0 + 25 * MINUTE)).toBe(5 * MINUTE);
  expect(isOver(running, t0 + 29 * MINUTE)).toBe(false);

  const paused = addMinutes(pause(start(idle("focus", DEFAULT_MINUTES), t0), t0 + 20 * MINUTE), 5);
  expect(remaining(paused, t0 + 99 * MINUTE)).toBe(10 * MINUTE);
  expect(elapsed(paused, t0 + 99 * MINUTE)).toBe(20 * MINUTE);
});

test("reset gives the same mode back with a new id", () => {
  const timer = start(idle("short", DEFAULT_MINUTES, 2), t0);
  const fresh = reset(timer, DEFAULT_MINUTES);
  expect(fresh).toMatchObject({ mode: "short", focusCount: 2, startedAt: null, remainingMs: 5 * MINUTE });
  expect(fresh.id).not.toBe(timer.id);
});

test("every fourth focus is followed by a long break, the others by a short one", () => {
  let timer = idle("focus", DEFAULT_MINUTES);
  const modes: string[] = [];
  for (let step = 0; step < 9; step++) {
    timer = next(timer, DEFAULT_MINUTES);
    modes.push(timer.mode);
  }
  expect(modes).toEqual(["short", "focus", "short", "focus", "short", "focus", "long", "focus", "short"]);
});

test("the clock rounds up so it reads 00:00 only at the end", () => {
  expect(clock(25 * MINUTE)).toBe("25:00");
  expect(clock(61_001)).toBe("01:02");
  expect(clock(1)).toBe("00:01");
  expect(clock(0)).toBe("00:00");
});
