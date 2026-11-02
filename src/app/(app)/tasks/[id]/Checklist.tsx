"use client";

import { unstable_rethrow } from "next/navigation";
import { useOptimistic, useState, useTransition, type FormEvent } from "react";
import { useHydrated } from "@/lib/useHydrated";
import { addSubtaskAction, deleteSubtaskAction, moveSubtaskAction, renameSubtaskAction, setSubtaskDoneAction } from "./actions";

type Item = { id: string; title: string; done: boolean };

export function Checklist({ taskId, subtasks }: { taskId: string; subtasks: Item[] }) {
  const hydrated = useHydrated();
  const [items, showItems] = useOptimistic(subtasks);
  const [, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  const done = items.filter((item) => item.done).length;

  // Tells whether it failed; a redirect from the action passes through.
  async function attempt(action: () => Promise<{ fields: Record<string, string[] | undefined> } | undefined>) {
    setError("");
    try {
      const result = await action();
      const message = result && Object.values(result.fields).flat()[0];
      if (message) setError(message);
      return Boolean(message);
    } catch (failure) {
      unstable_rethrow(failure);
      setError("Could not save. Check your connection and try again.");
      return true;
    }
  }

  function change(next: Item[], action: () => ReturnType<Parameters<typeof attempt>[0]>) {
    startTransition(async () => {
      showItems(next);
      await attempt(action);
    });
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdding(true);
    const failed = await attempt(() => addSubtaskAction(taskId, draft));
    setAdding(false);
    if (!failed) setDraft("");
  }

  function move(index: number, by: -1 | 1) {
    const rest = items.toSpliced(index, 1);
    const at = index + by;
    change(rest.toSpliced(at, 0, items[index]), () => moveSubtaskAction(items[index].id, rest[at - 1]?.id ?? null));
  }

  function rename(item: Item, input: HTMLInputElement) {
    const title = input.value.trim();
    if (!title || title === item.title) {
      input.value = item.title;
      return;
    }
    change(items.map((option) => (option.id === item.id ? { ...option, title } : option)), () => renameSubtaskAction(item.id, title));
  }

  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Checklist</h2>
        <span className="text-[13px] font-semibold">
          {done}/{items.length} done
        </span>
      </div>
      <div aria-hidden="true" className="h-2.5 overflow-hidden rounded-full border border-ink bg-[#ececE8]">
        <div style={{ width: `${items.length ? Math.round((done / items.length) * 100) : 0}%` }} className="h-full bg-teal" />
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <ul aria-label="Checklist" className="flex flex-col gap-3">
        {items.map((item, index) => (
          <li key={item.id} className="flex items-center gap-2 rounded-control border-hard bg-white py-2 pr-1.5 pl-3 shadow-hard-3">
            <input
              type="checkbox"
              aria-label={item.title}
              checked={item.done}
              disabled={!hydrated}
              onChange={() => change(items.map((option) => (option.id === item.id ? { ...option, done: !item.done } : option)), () => setSubtaskDoneAction(item.id, !item.done))}
              className="size-6 flex-none accent-teal"
            />
            <input
              type="text"
              aria-label={`Edit ${item.title}`}
              defaultValue={item.title}
              maxLength={200}
              disabled={!hydrated}
              onBlur={(event) => rename(item, event.currentTarget)}
              onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
              className={`h-9 w-full min-w-0 flex-1 rounded-lg px-1.5 font-content text-sm pointer-coarse:text-base ${item.done ? "text-muted line-through" : ""}`}
            />
            {(["up", "down"] as const).map((direction) => {
              const by = direction === "up" ? -1 : 1;
              return (
                <button
                  key={direction}
                  type="button"
                  aria-label={`Move ${item.title} ${direction}`}
                  disabled={!hydrated || !items[index + by]}
                  onClick={() => move(index, by)}
                  className="flex size-8 flex-none items-center justify-center rounded-lg pointer-coarse:size-11"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={direction === "up" ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} />
                  </svg>
                </button>
              );
            })}
            <button
              type="button"
              aria-label={`Delete ${item.title}`}
              disabled={!hydrated}
              onClick={() => change(items.filter((option) => option.id !== item.id), () => deleteSubtaskAction(item.id))}
              className="flex size-8 flex-none items-center justify-center rounded-lg pointer-coarse:size-11"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="flex h-12.5 items-center gap-2.5 rounded-control border-[1.5px] border-dashed border-ink px-3.5">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <input
          type="text"
          aria-label="Add checklist item"
          placeholder="Add an item and press Enter"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={200}
          disabled={!hydrated || adding}
          enterKeyHint="done"
          className="h-full w-full min-w-0 flex-1 bg-transparent font-content text-sm pointer-coarse:text-base"
        />
      </form>
    </section>
  );
}
