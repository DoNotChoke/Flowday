"use client";

import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { columns } from "@/components/app/board/columns";
import { priorities } from "@/components/app/board/TaskCard";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { Field } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { estimateLabel } from "@/lib/progress";
import { useHydrated } from "@/lib/useHydrated";
import type { getTaskDetail, UpdateTaskInput } from "@/services/tasks";
import { deleteTaskAction, updateTaskAction } from "./actions";

type Task = NonNullable<Awaited<ReturnType<typeof getTaskDetail>>>;
type Option = { id: string; name: string };
type Props = { task: Task; categories: Option[]; projects: Option[]; children: ReactNode };

function unreachable(error: unknown) {
  // A redirect from an action arrives here as a rejection.
  unstable_rethrow(error);
  return { fields: { form: ["Could not reach Flowday. Check your connection and try again."] } };
}

function Tile({ label, tone, disabled, onClick, children }: { label: string; tone: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`flex min-w-0 flex-col rounded-control px-3.5 py-3 text-left ${tone}`}>
      <span className="text-xs text-muted">{label}</span>
      <span className="mt-1 text-sm font-semibold break-words">{children}</span>
    </button>
  );
}

function PencilButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="flex size-9 flex-none items-center justify-center rounded-[10px] border-hard bg-white pointer-coarse:size-11">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
      </svg>
    </button>
  );
}

export function TaskFields({ task, categories, projects, children }: Props) {
  const hydrated = useHydrated();
  const [editing, setEditing] = useState<keyof typeof editors | null>(null);
  const [menu, setMenu] = useState<"actions" | "delete" | null>(null);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  const column = columns.find((option) => option.status === task.status)!;
  const priority = priorities[task.priority];
  const categoryNames = categories.filter((option) => task.categoryIds.includes(option.id)).map((option) => option.name);
  const canceled = task.status === "canceled";
  const failure = Object.values(errors).flat()[0];

  const editors = {
    title: {
      label: "title",
      read: (values: FormData): UpdateTaskInput => ({ title: String(values.get("title")) }),
      fields: <Field label="Title" name="title" defaultValue={task.title} maxLength={200} className="font-content" />,
    },
    description: {
      label: "description",
      read: (values: FormData): UpdateTaskInput => ({ description: String(values.get("description")) || null }),
      fields: <Field as="textarea" label="Description" name="description" rows={6} defaultValue={task.description ?? ""} className="font-content" />,
    },
    status: {
      label: "status",
      read: (values: FormData): UpdateTaskInput => ({ status: String(values.get("status")) as Task["status"] }),
      fields: (
        <Field as="select" label="Status" name="status" defaultValue={task.status}>
          {columns.map((option) => (
            <option key={option.status} value={option.status}>
              {option.name}
            </option>
          ))}
        </Field>
      ),
    },
    priority: {
      label: "priority",
      read: (values: FormData): UpdateTaskInput => ({ priority: String(values.get("priority")) as Task["priority"] }),
      fields: (
        <Field as="select" label="Priority" name="priority" defaultValue={task.priority}>
          {Object.entries(priorities).map(([value, option]) => (
            <option key={value} value={value}>
              {option.label}
            </option>
          ))}
        </Field>
      ),
    },
    categories: {
      label: "categories",
      read: (values: FormData): UpdateTaskInput => ({ categoryIds: values.getAll("category").map(String) }),
      fields: (
        <div className="flex flex-col">
          {categories.map((option) => (
            <label key={option.id} className="flex min-h-11 items-center gap-3 font-content text-sm">
              <input type="checkbox" name="category" value={option.id} defaultChecked={task.categoryIds.includes(option.id)} className="size-5 accent-ink" />
              {option.name}
            </label>
          ))}
        </div>
      ),
    },
    project: {
      label: "project",
      read: (values: FormData): UpdateTaskInput => ({ projectId: String(values.get("project")) || null }),
      fields: (
        <Field as="select" label="Project" name="project" defaultValue={task.projectId ?? ""} className="font-content">
          <option value="">No project (Inbox)</option>
          {projects.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </Field>
      ),
    },
    deadline: {
      label: "deadline",
      read: (values: FormData): UpdateTaskInput => ({ dueDate: String(values.get("date")) || null, dueTime: String(values.get("time")) || null }),
      fields: (
        <div className="grid gap-4 md:grid-cols-2">
          <DateField label="Due date" name="date" defaultValue={task.dueDate} />
          <Field label="Time" name="time" type="time" defaultValue={task.dueTime} />
        </div>
      ),
    },
    estimate: {
      label: "estimate",
      read: (values: FormData): UpdateTaskInput => ({ estimateMin: Number(values.get("minutes")) || null }),
      fields: <Field label="Minutes" name="minutes" type="number" min={0} max={100000} defaultValue={task.estimateMin ?? ""} />,
    },
  };

  function open(field: keyof typeof editors) {
    setErrors({});
    setEditing(field);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const input = editors[editing].read(new FormData(event.currentTarget));
    setPending(true);
    setErrors({});
    const result = await updateTaskAction(task.id, input).catch(unreachable);
    setPending(false);
    if (result) return setErrors(result.fields);
    setEditing(null);
  }

  async function changeStatus(status: Task["status"]) {
    setPending(true);
    setErrors({});
    const result = await updateTaskAction(task.id, { status }).catch(unreachable);
    setPending(false);
    if (result) return setErrors(result.fields);
    setMenu(null);
  }

  async function remove() {
    setPending(true);
    setErrors({});
    const result = await deleteTaskAction(task.id).catch(unreachable);
    setPending(false);
    if (result) setErrors(result.fields);
  }

  const alert = failure && (
    <p role="alert" className="mt-4 text-sm font-medium text-danger">
      {failure}
    </p>
  );

  return (
    <article className="flex min-w-0 flex-[3_1_480px] flex-col gap-5.5 rounded-card border-hard bg-white p-5 shadow-hard-5 md:p-7">
      <div className="flex items-center justify-between gap-3">
        <Link href="/tasks" aria-label="Back to tasks" className="flex size-11 items-center justify-center rounded-xl border-hard">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className="flex items-center gap-2">
          <button type="button" aria-label={`Status: ${column.name}`} disabled={!hydrated} onClick={() => open("status")} className={`min-h-11 rounded-[10px] border-hard px-3.5 text-[13px] font-semibold ${column.tone}`}>
            {column.name}
          </button>
          <button
            type="button"
            aria-label="More actions"
            disabled={!hydrated}
            onClick={() => {
              setErrors({});
              setMenu("actions");
            }}
            className="flex size-11 items-center justify-center rounded-xl border-hard bg-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {task.code && <span className="text-[13px] font-semibold text-muted">{task.code}</span>}
        <div className="flex items-start justify-between gap-3">
          <h1 className={`min-w-0 font-content text-3xl font-bold tracking-[-0.6px] break-words ${canceled ? "line-through" : ""}`}>{task.title}</h1>
          <PencilButton label="Edit title" disabled={!hydrated} onClick={() => open("title")} />
        </div>
        <div className="flex items-start justify-between gap-3">
          <p className="max-w-180 min-w-0 font-content text-[15px] leading-relaxed break-words whitespace-pre-wrap text-muted">{task.description || "No description yet"}</p>
          <PencilButton label="Edit description" disabled={!hydrated} onClick={() => open("description")} />
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <Tile label="Category" tone="bg-[#f7f7f4]" disabled={!hydrated} onClick={() => open("categories")}>
          <span className="font-content">{categoryNames.join(" · ") || "None"}</span>
        </Tile>
        <Tile label="Priority" tone={priority.tone} disabled={!hydrated} onClick={() => open("priority")}>
          {priority.label}
        </Tile>
        <Tile label="Deadline" tone="bg-coral-tint" disabled={!hydrated} onClick={() => open("deadline")}>
          {task.dueLabel ?? "Not set"}
        </Tile>
        <Tile label="Project" tone="bg-[#f7f7f4]" disabled={!hydrated} onClick={() => open("project")}>
          <span className="font-content">{task.projectName ?? "Inbox"}</span>
        </Tile>
        <Tile label="Estimate" tone="bg-[#f7f7f4]" disabled={!hydrated} onClick={() => open("estimate")}>
          {task.estimateMin ? estimateLabel(task.estimateMin) : "Not set"}
        </Tile>
      </div>

      {children}

      <Sheet open={Boolean(editing)} onClose={() => setEditing(null)} title={`Edit ${editing ? editors[editing].label : "task"}`}>
        {editing && (
          <form key={editing} onSubmit={save}>
            {editors[editing].fields}
            {alert}
            <Button type="submit" size="md" className="mt-5 w-full" disabled={pending}>
              Save
            </Button>
          </form>
        )}
      </Sheet>

      <Sheet open={Boolean(menu)} onClose={() => setMenu(null)} title={menu === "delete" ? "Delete this task?" : "Task actions"}>
        {menu === "actions" && (
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="md" disabled={pending} onClick={() => changeStatus(canceled ? "ongoing" : "canceled")}>
              {canceled ? "Restore task" : "Cancel task"}
            </Button>
            <Button variant="outline" size="md" onClick={() => setMenu("delete")}>
              Delete task
            </Button>
            {alert}
          </div>
        )}
        {menu === "delete" && (
          <div className="flex flex-col gap-2">
            <p className="mb-2 text-sm text-muted">It is removed for good. To keep it out of the way instead, cancel it.</p>
            <Button variant="dark" size="md" disabled={pending} onClick={remove}>
              Delete forever
            </Button>
            <Button variant="outline" size="md" onClick={() => setMenu("actions")}>
              Keep task
            </Button>
            {alert}
          </div>
        )}
      </Sheet>
    </article>
  );
}
