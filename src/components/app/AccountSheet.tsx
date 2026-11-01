"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { useHydrated } from "@/lib/useHydrated";

export function AccountSheet({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    // Safari does not focus a button on click, so <dialog> has nothing to restore.
    button.current?.focus();
  }

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label="Account"
        disabled={!hydrated}
        onClick={() => setOpen(true)}
        className="flex size-11 items-center justify-center rounded-xl border-hard bg-white"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 21a8 8 0 0 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        </svg>
      </button>
      <Sheet open={open} onClose={close} title="Account">
        {/* Any link inside navigates away, so the drawer closes with it. */}
        <div className="flex flex-col gap-3" onClick={(event) => (event.target as HTMLElement).closest("a") && close()}>
          <Link href="/settings" className="flex min-h-11 items-center rounded-xl px-1.5 text-sm font-medium">
            Settings
          </Link>
          {children}
        </div>
      </Sheet>
    </>
  );
}
