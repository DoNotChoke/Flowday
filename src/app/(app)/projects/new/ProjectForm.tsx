"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { projectColors, projectIcons, projectKey, projectTemplates } from "@/lib/projects";
import { useHydrated } from "@/lib/useHydrated";
import { createProjectAction } from "./actions";

type Errors = Record<string, string[] | undefined>;

function Icon({ path, size = 18 }: { path: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

export function ProjectForm() {
  const hydrated = useHydrated();
  const [template, setTemplate] = useState("software");
  const [name, setName] = useState("");
  const [color, setColor] = useState(projectColors[0].hex);
  const [icon, setIcon] = useState(projectIcons[0].name);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const key = projectKey(name);
  const chosen = projectTemplates.find((option) => option.id === template)!;
  const iconPath = projectIcons.find((option) => option.name === icon)!.path;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const budget = String(values.get("budget"));
    setPending(true);
    setErrors({});

    const result = await createProjectAction({
      name,
      color,
      icon,
      template,
      description: String(values.get("description")) || null,
      startDate: String(values.get("start")) || null,
      targetDate: String(values.get("target")) || null,
      budgetHours: budget ? Number(budget) : null,
    }).catch(() => ({ fields: { form: ["Could not reach Flowday. Check your connection and try again."] } }));

    if (result) {
      setErrors(result.fields);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-6">
      <form onSubmit={submit} className="flex min-w-0 flex-[3_1_480px] flex-col gap-6 rounded-card border-hard bg-white p-5 shadow-hard-5 md:p-7">
        <fieldset className="min-w-0">
          <legend className="mb-2.5 text-sm font-semibold">Start from a template</legend>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
            {projectTemplates.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={option.id === template}
                onClick={() => setTemplate(option.id)}
                className={`flex flex-col gap-2 rounded-2xl border-hard p-3.5 text-left ${option.id === template ? "-translate-y-0.5 bg-sun-tint shadow-hard-4" : "bg-white"}`}
              >
                <span className="flex size-9 items-center justify-center rounded-[10px] border-hard bg-white">
                  <Icon path={option.icon} />
                </span>
                <span className="text-sm font-semibold">{option.name}</span>
                <span className="text-xs leading-snug text-[#3d3d3d]">{option.description}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="min-w-0 md:col-span-2">
            <Field
              label="Project name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Flowday app"
              required
              maxLength={80}
              error={errors.name?.[0]}
              className="font-content"
            />
          </div>
          <Field label="Task prefix" value={key} readOnly hint={`Tasks get IDs like ${key}-12`} className="bg-[#f7f7f4] font-semibold tracking-[1px]" />
        </div>

        <Field as="textarea" label="Goal & description" name="description" rows={3} placeholder="What does “done” look like for this project?" className="font-content" />

        <div className="flex flex-wrap gap-7">
          <fieldset className="min-w-0">
            <legend className="mb-2.5 text-sm font-semibold">Color</legend>
            <div className="flex flex-wrap gap-2">
              {projectColors.map((option) => (
                <button
                  key={option.hex}
                  type="button"
                  aria-label={option.name}
                  aria-pressed={option.hex === color}
                  onClick={() => setColor(option.hex)}
                  style={{ backgroundColor: option.hex }}
                  className={`size-10 rounded-xl border-hard pointer-coarse:size-11 ${option.hex === color ? "outline-2 outline-offset-2 outline-ink" : ""}`}
                />
              ))}
            </div>
          </fieldset>
          <fieldset className="min-w-0">
            <legend className="mb-2.5 text-sm font-semibold">Icon</legend>
            <div className="flex flex-wrap gap-2">
              {projectIcons.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  aria-label={option.name}
                  aria-pressed={option.name === icon}
                  onClick={() => setIcon(option.name)}
                  className={`flex size-11 items-center justify-center rounded-xl border-hard ${option.name === icon ? "bg-sun-tint" : "bg-white"}`}
                >
                  <Icon path={option.path} />
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Start date" name="start" type="date" />
          <Field label="Target end date" name="target" type="date" error={errors.targetDate?.[0]} />
          <Field label="Time budget (hours)" name="budget" type="number" min={0} />
        </div>

        {errors.form && (
          <p role="alert" className="text-sm font-medium text-danger">
            {errors.form[0]}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-3">
          <Button href="/tasks" variant="outline">
            Cancel
          </Button>
          <Button type="submit" disabled={pending || !hydrated} className="px-8">
            Create project
          </Button>
        </div>
      </form>

      <aside className="flex min-w-0 flex-[2_1_300px] flex-col gap-4">
        <span className="text-xs font-semibold tracking-[1px] text-muted">LIVE PREVIEW</span>
        <div style={{ backgroundColor: color }} className="flex flex-col gap-4 rounded-[22px] border-hard p-5 shadow-hard-5">
          <div className="flex items-center gap-3">
            <span className="flex size-12 flex-none items-center justify-center rounded-[14px] border-hard bg-white">
              <Icon path={iconPath} size={22} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-content text-lg font-bold">{name.trim() || "Untitled project"}</span>
              <span className="text-xs">
                {key} · {chosen.name}
              </span>
            </span>
          </div>
          <div className="h-2.5 rounded-full border border-ink bg-white/60" />
          <span className="text-xs font-medium">0 / {chosen.starter.length} tasks</span>
        </div>

        <div className="flex flex-col gap-3 rounded-[22px] border-hard bg-white p-5">
          <span className="text-sm font-semibold">Starter tasks from template</span>
          <ul className="flex flex-col gap-2">
            {chosen.starter.map((title) => (
              <li key={title} className="flex items-center gap-2.5 rounded-[10px] bg-[#f7f7f4] px-2.5 py-2 text-[13px]">
                <span className="size-4 flex-none rounded-[5px] border-hard bg-white" />
                {title}
              </li>
            ))}
          </ul>
          <span className="text-xs text-muted">You can edit or remove them after creating.</span>
        </div>
      </aside>
    </div>
  );
}
