"use client";

import { unstable_rethrow } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { previewQuickAddAction, quickAddAction } from "@/app/(app)/tasks/actions";
import { priorities } from "@/components/app/board/TaskCard";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";

type Preview = Awaited<ReturnType<typeof previewQuickAddAction>>;

function dueLabel({ dueDate, dueTime }: Preview) {
  if (!dueDate) return "No deadline";
  const day = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(dueDate));
  return dueTime ? `${day}, ${dueTime}` : day;
}

export function QuickAdd() {
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<{ text: string; parsed: Preview } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const parsed = preview?.text === text.trim() ? preview.parsed : null;

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "n" || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement;
      if (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (document.querySelector("dialog[open]")) return;
      event.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  // After Sheet's own effect, which hands focus to its Close button.
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  useEffect(() => {
    const value = text.trim();
    if (!value) return;
    let stale = false;
    const timer = setTimeout(async () => {
      const result = await previewQuickAddAction(value).catch((failure) => {
        unstable_rethrow(failure);
        return null;
      });
      if (result && !stale) setPreview({ text: value, parsed: result });
    }, 200);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [text]);

  function close() {
    setOpen(false);
    setText("");
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await quickAddAction(text).catch((failure) => {
      unstable_rethrow(failure);
      return { fields: { form: ["Could not reach Flowday. Check your connection and try again."] } };
    });
    setPending(false);
    if (result) return setError(Object.values(result.fields).flat()[0] ?? "");
    close();
  }

  return (
    <Sheet open={open} onClose={close} title="Quick add">
      {open && (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field
            ref={input}
            label="Task"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Review PR tomorrow 9am #Development !high"
            hint="Add a date, #category and !priority anywhere."
            readOnly={pending}
            className="font-content"
          />
          {parsed && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted">Name</dt>
              <dd className="min-w-0 font-content font-medium break-words">{parsed.title}</dd>
              <dt className="text-muted">Deadline</dt>
              <dd>{dueLabel(parsed)}</dd>
              <dt className="text-muted">Category</dt>
              <dd className="font-content">{parsed.categories.join(" · ") || "None"}</dd>
              <dt className="text-muted">Priority</dt>
              <dd>{parsed.priority ? priorities[parsed.priority].label : "Medium"}</dd>
            </dl>
          )}
          {error && (
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          )}
          <Button type="submit" size="md" disabled={pending}>
            Add task
          </Button>
        </form>
      )}
    </Sheet>
  );
}
