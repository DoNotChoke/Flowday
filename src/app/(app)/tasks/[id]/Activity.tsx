"use client";

import { unstable_rethrow } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { columns } from "@/components/app/board/columns";
import { useHydrated } from "@/lib/useHydrated";
import type { ActivityPayload, Actor } from "@/services/activity";
import { addCommentAction } from "./actions";

type Row = { id: string; type: string; actor: Actor; payload: ActivityPayload | null; when: string };

function statusName(status?: string) {
  return columns.find((column) => column.status === status)?.name;
}

function Quoted({ children }: { children: ReactNode }) {
  return <span className="font-content">“{children}”</span>;
}

function sentence({ type, payload }: Row) {
  const title = payload?.title;
  switch (type) {
    case "created":
      return "created this task";
    case "status":
      return (
        <>
          moved this task to <b>{statusName(payload?.to)}</b>
        </>
      );
    case "updated":
      return `changed the ${payload?.field}`;
    case "subtask_added":
      return (
        <>
          added <Quoted>{title}</Quoted>
        </>
      );
    case "subtask_done":
      return (
        <>
          {payload?.done ? "completed" : "reopened"} <Quoted>{title}</Quoted>
        </>
      );
    case "subtask_renamed":
      return (
        <>
          renamed an item to <Quoted>{title}</Quoted>
        </>
      );
    case "subtask_deleted":
      return (
        <>
          removed <Quoted>{title}</Quoted>
        </>
      );
    case "comment":
      return (
        <>
          commented: <Quoted>{payload?.body}</Quoted>
        </>
      );
    default:
      return "changed this task";
  }
}

export function Activity({ taskId, rows }: { taskId: string; rows: Row[] }) {
  const hydrated = useHydrated();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError("");
    const result = await addCommentAction(taskId, draft).catch((failure) => {
      unstable_rethrow(failure);
      return { fields: { form: ["Could not send. Check your connection and try again."] } };
    });
    setSending(false);
    if (result) return setError(Object.values(result.fields).flat()[0] ?? "");
    setDraft("");
  }

  return (
    <section aria-label="Activity" className="flex min-w-0 flex-col gap-4 rounded-[22px] border-hard bg-white p-5.5">
      <h2 className="text-[15px] font-semibold">Activity</h2>
      <form onSubmit={send} className="flex items-center gap-2 rounded-control border-hard py-1 pr-1 pl-3.5">
        <input
          type="text"
          aria-label="Write a comment"
          placeholder="Write a comment…"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={5000}
          readOnly={sending}
          disabled={!hydrated}
          className="h-10 w-full min-w-0 flex-1 font-content text-[13px] focus-visible:outline-none pointer-coarse:text-base"
        />
        <button type="submit" aria-label="Send comment" disabled={!hydrated || sending} className="flex size-10 flex-none items-center justify-center rounded-[10px] bg-ink text-white pointer-coarse:size-11">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
          </svg>
        </button>
      </form>
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <ol aria-label="Activity" className="flex flex-col gap-4">
        {rows.map((row) => (
          <li key={row.id} className="text-[13px] leading-relaxed break-words whitespace-pre-wrap">
            <b>{row.actor === "mcp" ? "Claude" : "You"}</b> {sentence(row)}
            <div className="text-xs text-muted">{row.when}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}
