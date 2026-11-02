"use client";

import { unstable_rethrow } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { Field } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { useHydrated } from "@/lib/useHydrated";
import { addMilestoneAction, deleteMilestoneAction, updateMilestoneAction } from "./actions";

type Milestone = { id: string; name: string; dueDate: string | null; taskCount: number; percent: number; state: string };
type Editing = Milestone | "new" | null;

const stateTones: Record<string, string> = { Done: "bg-teal-tint", "In progress": "bg-sun-tint" };

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(date));
}

export function Milestones({ projectId, milestones }: { projectId: string; milestones: Milestone[] }) {
  const hydrated = useHydrated();
  const [editing, setEditing] = useState<Editing>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const current = editing === "new" ? null : editing;

  function open(next: Editing) {
    setError("");
    setEditing(next);
  }

  async function run(action: () => Promise<{ fields: Record<string, string[] | undefined> } | undefined>) {
    setPending(true);
    setError("");
    const result = await action().catch((failure) => {
      unstable_rethrow(failure);
      return { fields: { form: ["Could not reach Flowday. Check your connection and try again."] } };
    });
    setPending(false);
    if (result) return setError(Object.values(result.fields).flat()[0] ?? "");
    setEditing(null);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const input = { name: String(values.get("name")), dueDate: String(values.get("date")) || null };
    run(() => (current ? updateMilestoneAction(current.id, input) : addMilestoneAction(projectId, input)));
  }

  return (
    <section aria-labelledby="milestones" className="flex min-w-0 flex-col gap-4 rounded-[22px] border-hard bg-white p-5.5 shadow-hard-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="milestones" className="text-[17px] font-semibold">
          Milestones
        </h2>
        <button type="button" disabled={!hydrated} onClick={() => open("new")} className="h-9 rounded-[10px] border-[1.5px] border-dashed border-ink px-3 text-xs pointer-coarse:min-h-11">
          + Milestone
        </button>
      </div>

      {milestones.length === 0 ? (
        <p className="rounded-2xl border-[1.5px] border-dashed border-[#9c9c96] p-5 text-center text-[13px] text-muted">No milestones yet</p>
      ) : (
        <ol className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
          {milestones.map((milestone) => (
            <li key={milestone.id} className="min-w-0">
              <button type="button" disabled={!hydrated} onClick={() => open(milestone)} className={`flex w-full flex-col gap-2 rounded-2xl border-hard p-3.5 text-left ${stateTones[milestone.state] ?? "bg-white"}`}>
                <span className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">{milestone.dueDate ? dateLabel(milestone.dueDate) : "No date"}</span>
                  <span className="rounded-full border border-ink bg-white px-2 py-0.5 text-[11px] font-semibold">{milestone.state}</span>
                </span>
                <span className="font-content text-sm font-semibold break-words">{milestone.name}</span>
                <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-ink/12">
                  <span style={{ width: `${milestone.percent}%` }} className="block h-full bg-ink" />
                </span>
                <span className="text-xs text-[#3d3d3d]">
                  {milestone.percent}% · {milestone.taskCount} {milestone.taskCount === 1 ? "task" : "tasks"}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}

      <Sheet open={Boolean(editing)} onClose={() => setEditing(null)} title={current ? "Edit milestone" : "New milestone"}>
        {editing && (
          <form key={current?.id ?? "new"} onSubmit={save} className="flex flex-col gap-4">
            <Field label="Milestone name" name="name" defaultValue={current?.name} maxLength={80} className="font-content" />
            <DateField label="Due date" name="date" defaultValue={current?.dueDate ?? ""} />
            {error && (
              <p role="alert" className="text-sm font-medium text-danger">
                {error}
              </p>
            )}
            <Button type="submit" size="md" disabled={pending}>
              Save
            </Button>
            {current && (
              <Button variant="outline" size="md" disabled={pending} onClick={() => run(() => deleteMilestoneAction(current.id))}>
                Delete milestone
              </Button>
            )}
          </form>
        )}
      </Sheet>
    </section>
  );
}
