"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "./Button";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function Sheet({ open, onClose, title, children }: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      className="mx-auto mt-auto mb-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-card border-hard bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-ink transition-transform duration-200 backdrop:bg-ink/40 motion-reduce:transition-none starting:open:translate-y-full md:m-auto md:max-w-lg md:rounded-card md:shadow-hard-5 md:starting:open:translate-y-0"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id={titleId} className="text-xl font-semibold">
          {title}
        </h2>
        <Button variant="outline" size="sm" aria-label="Close" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </Button>
      </div>
      <div className="mt-4">{children}</div>
    </dialog>
  );
}
