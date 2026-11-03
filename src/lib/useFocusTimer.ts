"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DEFAULT_MINUTES, idle, isOver, next, type Durations, type Timer } from "./focusTimer";

const KEY = "flowday.focus";
const CHANGED = "flowday-focus-changed";
const labels = { focus: "Focus", short: "Short break", long: "Long break" };

function subscribe(onChange: () => void) {
  // "storage" only fires in other tabs, so writes in this tab send their own event.
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

export function saveTimer(timer: Timer) {
  localStorage.setItem(KEY, JSON.stringify(timer));
  window.dispatchEvent(new Event(CHANGED));
}

let audio: AudioContext | undefined;

// Called from a click, the only moment browsers allow sound and the permission prompt.
export function prepareAlerts() {
  if ("AudioContext" in window) {
    audio ??= new AudioContext();
    void audio.resume();
  }
  if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();
}

function chime() {
  if (!audio) return;
  for (const [offset, pitch] of [[0, 880], [0.25, 1175]]) {
    const tone = audio.createOscillator();
    const volume = audio.createGain();
    tone.frequency.value = pitch;
    volume.gain.setValueAtTime(0.2, audio.currentTime + offset);
    volume.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + offset + 0.4);
    tone.connect(volume).connect(audio.destination);
    tone.start(audio.currentTime + offset);
    tone.stop(audio.currentTime + offset + 0.4);
  }
}

function announce(finished: Timer, coming: Timer) {
  chime();
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const title = finished.mode === "focus" ? "Focus session done" : "Break is over";
  new Notification(title, { body: `Next: ${labels[coming.mode]}.`, tag: "flowday-focus" });
}

// The saved timer, ticking while it runs. Null until the browser has read it and the time.
export function useFocusTimer(minutes: Durations = DEFAULT_MINUTES) {
  const saved = useSyncExternalStore(subscribe, () => localStorage.getItem(KEY), () => undefined);
  // Read in effects: Next refuses the time during render, where it would differ from the server's.
  const [now, setNow] = useState(0);
  const openedAt = useRef(0);
  const stored: Timer | null = saved ? JSON.parse(saved) : null;
  // A timer that has not started yet follows the current lengths, even ones changed on another device.
  const fresh = !stored || (stored.startedAt === null && stored.durationMs !== minutes[stored.mode] * 60_000);
  const timer: Timer | null = saved === undefined ? null : fresh ? idle(stored?.mode ?? "focus", minutes, stored?.focusCount) : stored;

  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  useEffect(() => {
    const endsAt = timer?.endsAt;
    let live = true;
    const update = () => live && setNow(Date.now());
    queueMicrotask(update);
    if (!endsAt) {
      return () => {
        live = false;
      };
    }
    const tick = setInterval(update, 250);
    // Chrome slows repeating timers in a hidden tab to once a minute, but not a single timeout.
    const end = setTimeout(update, endsAt - Date.now());
    return () => {
      live = false;
      clearInterval(tick);
      clearTimeout(end);
    };
  }, [timer?.endsAt]);

  useEffect(() => {
    if (!timer || !isOver(timer, Date.now())) return;
    const coming = next(timer, minutes);
    saveTimer(coming);
    // A timer that ran out while the app was closed moves on quietly.
    if (timer.endsAt! > openedAt.current) announce(timer, coming);
  }, [timer, now, minutes]);

  return { timer: now ? timer : null, now };
}

export { labels as modeLabels };
