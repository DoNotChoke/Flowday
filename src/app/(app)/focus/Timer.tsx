"use client";

import { useEffect, useSyncExternalStore } from "react";
import { addMinutes, clock, idle, isRunning, next, pause, remaining, reset, start, type Durations, type Mode } from "@/lib/focusTimer";
import { modeLabels, prepareAlerts, saveTimer, useFocusTimer } from "@/lib/useFocusTimer";
import { TimerSettings } from "./TimerSettings";

const tones: Record<Mode, string> = { focus: "bg-sun", short: "bg-teal", long: "bg-blue" };
const modes = Object.keys(modeLabels) as Mode[];

function Icon({ path, fill = false }: { path: string; fill?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

const permissionOf = () => ("Notification" in window ? Notification.permission : "unsupported");
const noSubscribe = () => () => {};

export function Timer({ minutes }: { minutes: Durations }) {
  const { timer, now } = useFocusTimer(minutes);
  const permission = useSyncExternalStore(noSubscribe, permissionOf, () => "default");
  const left = timer ? remaining(timer, now) : minutes.focus * 60_000;
  const running = timer ? isRunning(timer) : false;

  useEffect(() => {
    if (!running) return;
    const before = document.title;
    document.title = `${clock(left)} · ${modeLabels[timer!.mode]} — Flowday`;
    return () => {
      document.title = before;
    };
  }, [running, left, timer]);

  if (!timer) return <div aria-hidden="true" className="h-[560px] min-w-0 flex-[3_1_460px] animate-pulse rounded-[28px] bg-panel motion-reduce:animate-none" />;

  const progress = 100 - (left / timer.durationMs) * 100;
  const minutesLeft = Math.ceil(left / 60_000);

  function toggle() {
    if (running) return saveTimer(pause(timer!, Date.now()));
    prepareAlerts();
    saveTimer(start(timer!, Date.now()));
  }

  return (
    <>
      <section aria-label="Timer" className={`flex min-w-0 flex-[3_1_460px] flex-col items-center gap-6.5 rounded-[28px] border-hard p-6 shadow-hard-6 md:p-8 ${tones[timer.mode]}`}>
        <div role="tablist" aria-label="Timer mode" className="flex max-w-full gap-1 rounded-control border-hard bg-white p-1">
          {modes.map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={timer.mode === mode}
              disabled={timer.startedAt !== null && timer.mode !== mode}
              onClick={() => saveTimer(idle(mode, minutes, timer.focusCount))}
              className={`h-10 rounded-[10px] px-3 text-[13px] whitespace-nowrap md:px-4.5 md:text-sm disabled:opacity-40 pointer-coarse:min-h-11 ${timer.mode === mode ? "bg-sun-tint font-semibold" : ""}`}
            >
              {modeLabels[mode]}
            </button>
          ))}
        </div>

        <div className="flex aspect-square w-[min(300px,80vw)] items-center justify-center rounded-full border-hard shadow-hard-6" style={{ background: `conic-gradient(#151515 0 ${progress}%, #ffffff 0)` }}>
          <div className="flex size-[84%] flex-col items-center justify-center gap-1 rounded-full border-hard bg-white">
            <span className="text-[clamp(44px,14vw,64px)] font-bold tracking-[-2px] tabular-nums">{clock(left)}</span>
            <span className="text-[13px] text-muted">{modeLabels[timer.mode]}</span>
          </div>
        </div>
        <p aria-live="polite" className="sr-only">
          {running ? `${minutesLeft} ${minutesLeft === 1 ? "minute" : "minutes"} left` : ""}
        </p>

        <div className="flex items-center justify-center gap-2.5 md:gap-3.5">
          <button type="button" aria-label="Reset timer" onClick={() => saveTimer(reset(timer, minutes))} className="flex size-13.5 items-center justify-center rounded-2xl border-hard bg-white shadow-hard-4">
            <Icon path="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
          </button>
          <button type="button" onClick={toggle} className="flex h-15 min-w-36 items-center md:min-w-45 justify-center gap-2.5 rounded-[18px] border-hard bg-ink px-7 text-[17px] font-semibold text-white shadow-[0_4px_0_#6b6b66]">
            <Icon fill path={running ? "M6 4h4v16H6zM14 4h4v16h-4z" : "M7 4v16l13-8z"} />
            {running ? "Pause" : timer.startedAt ? "Resume" : "Start"}
          </button>
          <button type="button" aria-label="Skip to next" onClick={() => saveTimer(next(timer, minutes))} className="flex size-13.5 items-center justify-center rounded-2xl border-hard bg-white shadow-hard-4">
            <Icon fill path="M5 4v16l10-8zM17 4h2.5v16H17z" />
          </button>
        </div>
        {timer.startedAt !== null && (
          <button type="button" onClick={() => saveTimer(addMinutes(timer, 5))} className="min-h-11 rounded-xl border-hard bg-white px-4 text-sm font-semibold">
            +5 min
          </button>
        )}
      </section>

      <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4.5">
        <TimerSettings minutes={minutes} />
        <section className="flex items-start gap-3.5 rounded-[22px] border-hard bg-lilac p-4.5">
          <span className="flex size-11 flex-none items-center justify-center rounded-xl border-hard bg-white">
            <Icon path="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
          </span>
          <p className="text-[13px] leading-normal">
            {permission === "denied" || permission === "unsupported"
              ? "Notifications are blocked for this site, so you will only hear a chime when time is up. Allow them in the browser's site settings to get a pop-up."
              : "You get a notification and a chime when time is up, even while you work in another window."}
          </p>
        </section>
      </aside>
    </>
  );
}
