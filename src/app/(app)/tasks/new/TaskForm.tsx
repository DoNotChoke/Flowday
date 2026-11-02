"use client";

import { unstable_rethrow } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { Field } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { Switch } from "@/components/ui/Switch";
import { useHydrated } from "@/lib/useHydrated";
import { createCategoryAction, createProjectAction, createTaskAction } from "./actions";

type Category = { id: string; name: string };
type Project = { id: string; name: string; color: string };
type Errors = Record<string, string[] | undefined>;

function unreachable(error: unknown) {
  // A redirect from an action arrives here as a rejection.
  unstable_rethrow(error);
  return { fields: { form: ["Could not reach Flowday. Check your connection and try again."] } };
}

const priorities = [
  { value: "low", label: "Low", tone: "bg-stone-tint" },
  { value: "medium", label: "Medium", tone: "bg-blue-tint" },
  { value: "high", label: "High", tone: "bg-sun-tint" },
  { value: "urgent", label: "Urgent", tone: "bg-coral-tint" },
] as const;

const statuses = [
  { value: "ongoing", label: "On going" },
  { value: "in_process", label: "In process" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
] as const;

const quickEstimates = [
  { label: "15m", minutes: 15 },
  { label: "30m", minutes: 30 },
  { label: "1h", minutes: 60 },
  { label: "2h", minutes: 120 },
  { label: "4h", minutes: 240 },
  { label: "1 day", minutes: 480 },
];

function estimateLabel(minutes: number) {
  if (!minutes) return "not set";
  const hours = Math.floor(minutes / 60);
  return [hours && `${hours}h`, minutes % 60 && `${minutes % 60}m`].filter(Boolean).join(" ");
}

type TaskFormProps = { categories: Category[]; projects: Project[]; projectId: string };

export function TaskForm({ categories: initialCategories, projects: initialProjects, projectId: initialProject }: TaskFormProps) {
  const hydrated = useHydrated();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<(typeof priorities)[number]["value"]>("medium");
  const [categories, setCategories] = useState(initialCategories);
  const [selected, setSelected] = useState<string[]>([]);
  const [projects, setProjects] = useState(initialProjects);
  const [projectId, setProjectId] = useState(initialProject);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [alert, setAlert] = useState(true);
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [addingProject, setAddingProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const totalMinutes = hours * 60 + minutes;
  const project = projects.find((option) => option.id === projectId);
  const shownPriority = priorities.find((option) => option.value === priority)!;
  const categorySummary = categories.filter((option) => selected.includes(option.id)).map((option) => option.name).join(" · ");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setPending(true);
    setErrors({});

    const result = await createTaskAction({
      title,
      description: description || null,
      priority,
      categoryIds: selected,
      projectId: projectId || null,
      estimateMin: totalMinutes || null,
      status: String(values.get("status")) as (typeof statuses)[number]["value"],
      dueDate: String(values.get("date")) || null,
      dueTime: String(values.get("time")) || null,
      alertEnabled: alert,
    }).catch(unreachable);

    if (result) {
      setErrors(result.fields);
      setPending(false);
    }
  }

  async function addCategory() {
    const result = await createCategoryAction(categoryName).catch(unreachable);
    if ("fields" in result) return setErrors(result.fields);

    setCategories([...categories, result.category]);
    setSelected([...selected, result.category.id]);
    setCategoryName("");
    setAddingCategory(false);
    setErrors({});
  }

  async function addProject() {
    const result = await createProjectAction(projectName).catch(unreachable);
    if ("fields" in result) return setErrors(result.fields);

    setProjects([...projects, result.project]);
    setProjectId(result.project.id);
    setProjectName("");
    setAddingProject(false);
    setErrors({});
  }

  return (
    <div className="flex flex-wrap items-start gap-6">
      <form onSubmit={submit} className="flex min-w-0 flex-[3_1_480px] flex-col gap-5.5 rounded-card border-hard bg-white p-5 shadow-hard-5 md:p-7">
        <Field
          label="Task name"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Design onboarding flow"
          maxLength={200}
          error={errors.title?.[0]}
          className="font-content"
        />
        <Field
          as="textarea"
          label="Description"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Add your task details"
          className="font-content"
        />

        <fieldset className="min-w-0">
          <legend className="mb-2.5 text-sm font-semibold">Priority</legend>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {priorities.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={option.value === priority}
                onClick={() => setPriority(option.value)}
                className={`h-12.5 rounded-control border-hard text-sm font-medium ${option.value === priority ? `${option.tone} shadow-hard-3` : "bg-white"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="min-w-0">
          <legend className="mb-2.5 text-sm font-semibold">Category</legend>
          <div className="flex flex-wrap gap-2">
            {categories.map((option) => {
              const on = selected.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSelected(on ? selected.filter((id) => id !== option.id) : [...selected, option.id])}
                  className={`h-9.5 max-w-full truncate rounded-full border-hard px-3.5 font-content text-[13px] font-medium pointer-coarse:min-h-11 ${on ? "bg-ink text-white" : "bg-white"}`}
                >
                  {option.name}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setAddingCategory(true)}
              className="h-9.5 rounded-full border-[1.5px] border-dashed border-ink px-3.5 text-[13px] pointer-coarse:min-h-11"
            >
              + New category
            </button>
          </div>
          {addingCategory && (
            <div className="mt-3 flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Field
                  label="Category name"
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  maxLength={40}
                  error={errors.name?.[0]}
                  className="font-content"
                  autoFocus
                />
              </div>
              <Button variant="dark" size="md" className="mt-7.5" onClick={addCategory}>
                Add
              </Button>
            </div>
          )}
        </fieldset>

        <div className="grid items-start gap-4 md:grid-cols-2">
          <div className="relative min-w-0">
            <button type="button" onClick={() => setAddingProject(true)} className="absolute top-0 right-0 text-xs font-medium underline hover:text-danger">
              + New project
            </button>
            <Field as="select" label="Project" value={projectId} onChange={(event) => setProjectId(event.target.value)} className="font-content">
              <option value="">No project (Inbox)</option>
              {projects.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Field>
          </div>

          <fieldset className="flex min-w-0 flex-col gap-2">
            <legend className="mb-2 text-sm font-semibold">Time estimate</legend>
            <div className="flex gap-2">
              <input
                type="number"
                aria-label="Hours"
                min={0}
                max={99}
                value={hours}
                onChange={(event) => setHours(Number(event.target.value))}
                className="h-12.5 w-full min-w-0 rounded-control border-hard bg-white px-3 text-[15px] font-semibold shadow-hard-3 pointer-coarse:text-base"
              />
              <input
                type="number"
                aria-label="Minutes"
                min={0}
                max={59}
                step={15}
                value={minutes}
                onChange={(event) => setMinutes(Number(event.target.value))}
                className="h-12.5 w-full min-w-0 rounded-control border-hard bg-white px-3 text-[15px] font-semibold shadow-hard-3 pointer-coarse:text-base"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickEstimates.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  aria-pressed={option.minutes === totalMinutes}
                  onClick={() => {
                    setHours(Math.floor(option.minutes / 60));
                    setMinutes(option.minutes % 60);
                  }}
                  className={`h-8 rounded-full border-hard px-3 text-xs font-medium pointer-coarse:min-h-11 ${option.minutes === totalMinutes ? "bg-sun-tint" : "bg-white"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted">≈ {Math.ceil(totalMinutes / 25)} focus sessions (25 min)</span>
          </fieldset>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Field as="select" label="Status" name="status" defaultValue="ongoing">
            {statuses.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Field>
          <DateField label="Due date" name="date" error={errors.dueDate?.[0]} />
          <Field label="Time" name="time" type="time" />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-control bg-[#f7f7f4] px-4 py-3.5">
          <div>
            <div className="text-sm font-semibold">Get alert for this task</div>
            <div className="text-xs text-muted">Email 30 min before due time</div>
          </div>
          <Switch label="Get alert for this task" checked={alert} onChange={setAlert} />
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
          <Button type="submit" disabled={pending || !hydrated} className="px-9">
            Create Task
          </Button>
        </div>
      </form>

      <aside className="flex min-w-0 flex-[2_1_300px] flex-col gap-4">
        <span className="text-xs font-semibold tracking-[1px] text-muted">LIVE PREVIEW</span>
        <div className="flex flex-col gap-3 rounded-[18px] border-hard bg-white p-4.5 shadow-hard-4">
          <div className="flex flex-wrap justify-between gap-2">
            <span className="max-w-full truncate rounded-full bg-[#f0f0ec] px-2.5 py-1 font-content text-[11px] font-medium">{categorySummary || "No category"}</span>
            <span className={`rounded-full border border-ink px-2.5 py-1 text-[11px] font-semibold ${shownPriority.tone}`}>{shownPriority.label}</span>
          </div>
          <div className="font-content text-[17px] leading-snug font-semibold break-words">{title.trim() || "Untitled task"}</div>
          {description && <div className="font-content text-[13px] leading-relaxed break-words whitespace-pre-line text-muted">{description}</div>}
          <div className="flex items-center gap-1.5 border-t border-dashed border-[#d6d6d1] pt-2.5 text-xs text-[#3d3d3d]">
            <span style={{ backgroundColor: project?.color ?? "#d6d6d1" }} className="size-2.25 flex-none rounded-[3px] border border-ink" />
            <span className="truncate font-content">{project?.name ?? "No project"}</span>
          </div>
          <div className="text-xs text-[#3d3d3d]">Est. {estimateLabel(totalMinutes)}</div>
        </div>
      </aside>

      <Sheet open={addingProject} onClose={() => setAddingProject(false)} title="New project">
        <div className="flex flex-col gap-4">
          <Field
            label="Project name"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            maxLength={80}
            error={errors.name?.[0]}
            className="font-content"
          />
          <Button onClick={addProject}>Create project</Button>
        </div>
      </Sheet>
    </div>
  );
}
