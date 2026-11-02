"use client";

import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { searchTasksAction } from "@/app/(app)/tasks/actions";
import { useHydrated } from "@/lib/useHydrated";
import { columns } from "./columns";

type Result = Awaited<ReturnType<typeof searchTasksAction>>[number];

export function SearchBox() {
  const hydrated = useHydrated();
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ query: string; results: Result[] | null } | null>(null);
  const [open, setOpen] = useState(false);

  const term = query.trim();
  const current = found?.query === term ? found.results : undefined;

  useEffect(() => {
    if (!term) return;
    let stale = false;
    const timer = setTimeout(async () => {
      const results = await searchTasksAction(term).catch((failure) => {
        unstable_rethrow(failure);
        return null;
      });
      if (!stale) setFound({ query: term, results });
    }, 200);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [term]);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k" || !(event.ctrlKey || event.metaKey)) return;
      const target = event.target as HTMLElement;
      // Someone typing elsewhere keeps whatever the browser does with this key.
      if (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      event.preventDefault();
      input.current?.focus();
    }
    function outside(event: PointerEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("keydown", shortcut);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("keydown", shortcut);
      document.removeEventListener("pointerdown", outside);
    };
  }, []);

  return (
    <div ref={box} className="relative w-full md:w-80">
      <div className="flex h-11 items-center gap-2.5 rounded-xl border-hard bg-white px-3.5 focus-within:outline-2 focus-within:-outline-offset-[1.5px] focus-within:outline-coral">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="flex-none">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={input}
          type="search"
          aria-label="Search tasks"
          placeholder="Search tasks…"
          value={query}
          maxLength={100}
          disabled={!hydrated}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            setQuery("");
            setOpen(false);
          }}
          className="h-full w-full min-w-0 flex-1 bg-transparent font-content text-sm focus-visible:outline-none pointer-coarse:text-base"
        />
        <kbd className="flex-none rounded-md border border-ink/30 px-1.5 py-0.5 font-sans text-[11px] text-muted pointer-coarse:hidden">Ctrl K</kbd>
      </div>
      {open && term && current !== undefined && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-control border-hard bg-white p-1.5 shadow-hard-4">
          {current === null && <p className="px-2.5 py-2 text-sm text-danger">Could not search. Check your connection and try again.</p>}
          {current?.length === 0 && <p className="px-2.5 py-2 text-sm text-muted">No tasks found</p>}
          {current && current.length > 0 && (
            <ul aria-label="Search results">
              {current.map((task) => (
                <li key={task.id}>
                  <Link href={`/tasks/${task.id}`} className="flex min-h-11 items-center justify-between gap-3 rounded-xl px-2.5 py-1.5 text-sm">
                    <span className="min-w-0 font-content font-medium break-words">{task.title}</span>
                    <span className="flex-none text-xs text-muted">{task.code ?? columns.find((column) => column.status === task.status)?.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
