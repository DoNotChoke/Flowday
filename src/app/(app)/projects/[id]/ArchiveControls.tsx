"use client";

import { unstable_rethrow } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useHydrated } from "@/lib/useHydrated";
import { archiveProjectAction, restoreProjectAction } from "./actions";

function useAttempt(action: () => Promise<void>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setPending(true);
    setError("");
    await action().catch((failure) => {
      // A redirect from the action arrives here as a rejection.
      unstable_rethrow(failure);
      setError("Could not reach Flowday. Check your connection and try again.");
    });
    setPending(false);
  }

  return { pending, error, run };
}

export function ArchiveButton({ id }: { id: string }) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const { pending, error, run } = useAttempt(() => archiveProjectAction(id));

  return (
    <>
      <Button variant="outline" size="md" disabled={!hydrated} onClick={() => setOpen(true)}>
        Archive project
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Archive this project?">
        <div className="flex flex-col gap-2">
          <p className="mb-2 text-sm text-muted">It leaves the sidebar and new task forms. Its tasks stay on your board, and you can restore it later.</p>
          <Button variant="dark" size="md" disabled={pending} onClick={run}>
            Archive
          </Button>
          <Button variant="outline" size="md" onClick={() => setOpen(false)}>
            Keep project
          </Button>
          {error && (
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          )}
        </div>
      </Sheet>
    </>
  );
}

export function RestoreButton({ id }: { id: string }) {
  const hydrated = useHydrated();
  const { pending, error, run } = useAttempt(() => restoreProjectAction(id));

  return (
    <div className="flex items-center gap-3">
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <Button variant="outline" size="sm" disabled={!hydrated || pending} onClick={run}>
        Restore project
      </Button>
    </div>
  );
}
