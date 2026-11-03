"use client";

import { unstable_rethrow } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import type { Durations } from "@/lib/focusTimer";
import { useHydrated } from "@/lib/useHydrated";
import { updateTimerSettingsAction } from "./actions";

const presets = [25, 50, 90];

export function TimerSettings({ minutes }: { minutes: Durations }) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(String(minutes.focus));
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  function show() {
    setFocus(String(minutes.focus));
    setErrors({});
    setOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setPending(true);
    const result = await updateTimerSettingsAction({
      focusMin: Number(values.get("focus")),
      shortBreakMin: Number(values.get("short")),
      longBreakMin: Number(values.get("long")),
    }).catch((error: unknown) => {
      // A redirect from an action arrives here as a rejection.
      unstable_rethrow(error);
      return { fields: { form: ["Could not reach Flowday. Check your connection and try again."] } };
    });
    setPending(false);
    if (result) return setErrors(result.fields);
    setOpen(false);
  }

  return (
    <section aria-label="Timer lengths" className="flex items-center justify-between gap-3 rounded-[22px] border-hard bg-white p-4.5 shadow-hard-4">
      <div>
        <h2 className="text-[15px] font-semibold">Timer lengths</h2>
        <p className="text-[13px] text-muted">
          Focus {minutes.focus} · Short {minutes.short} · Long {minutes.long} min
        </p>
      </div>
      <Button variant="outline" size="md" disabled={!hydrated} onClick={show}>
        Edit
      </Button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Timer lengths">
        <form onSubmit={save} className="flex flex-col gap-4">
          <div role="group" aria-label="Focus presets" className="flex gap-2">
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={focus === String(preset)}
                onClick={() => setFocus(String(preset))}
                className={`min-h-11 rounded-full border-hard px-4 text-[13px] font-medium ${focus === String(preset) ? "bg-ink text-white" : "bg-white"}`}
              >
                {preset} min
              </button>
            ))}
          </div>
          <Field label="Focus (minutes)" name="focus" type="number" min={5} max={180} required value={focus} onChange={(event) => setFocus(event.target.value)} error={errors.focusMin?.[0]} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Short break" name="short" type="number" min={1} max={60} required defaultValue={minutes.short} error={errors.shortBreakMin?.[0]} />
            <Field label="Long break" name="long" type="number" min={1} max={60} required defaultValue={minutes.long} error={errors.longBreakMin?.[0]} />
          </div>
          <p className="text-xs text-muted">New lengths start with the next session.</p>
          {errors.form && (
            <p role="alert" className="text-sm font-medium text-danger">
              {errors.form[0]}
            </p>
          )}
          <Button type="submit" size="md" disabled={pending}>
            Save
          </Button>
        </form>
      </Sheet>
    </section>
  );
}
