import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUserId } from "@/lib/auth/session";
import { relativeTime } from "@/lib/datetime";
import { estimateLabel } from "@/lib/progress";
import { listActivity } from "@/services/activity";
import { listCategories } from "@/services/categories";
import { trackedSeconds } from "@/services/focus";
import { listMilestones } from "@/services/milestones";
import { listProjects } from "@/services/projects";
import { listSubtasks } from "@/services/subtasks";
import { getTaskDetail } from "@/services/tasks";
import { Activity } from "./Activity";
import { Checklist } from "./Checklist";
import { TaskFields } from "./TaskFields";

async function Content({ params }: PageProps<"/tasks/[id]">) {
  const userId = await requireUserId();
  const { id } = await params;
  const [task, categories, projects, subtasks, activity, tracked] = await Promise.all([
    getTaskDetail(userId, id),
    listCategories(userId),
    listProjects(userId),
    listSubtasks(userId, id),
    listActivity(userId, id),
    trackedSeconds(userId, id),
  ]);
  if (!task) notFound();
  const milestones = task.projectId ? await listMilestones(userId, task.projectId) : [];

  // An archived project is off the list, yet this task still belongs to it.
  const options = task.projectId && !projects.some((row) => row.id === task.projectId) ? [...projects, { id: task.projectId, name: task.projectName ?? "" }] : projects;
  const now = new Date();
  const rows = activity.map(({ createdAt, ...row }) => ({ ...row, when: relativeTime(createdAt, now, task.timeZone) }));

  return (
    <div className="flex flex-wrap items-start gap-6">
      <TaskFields task={task} categories={categories} projects={options} milestones={milestones}>
        <Checklist taskId={id} subtasks={subtasks} />
      </TaskFields>
      <aside className="flex min-w-0 flex-[2_1_300px] flex-col gap-4.5">
        <section aria-label="Time tracked" className="flex flex-col gap-3.5 rounded-[22px] border-hard bg-sun p-5.5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold">Time tracked</h2>
            {task.estimateMin ? <span className="text-xs font-medium">Est. {estimateLabel(task.estimateMin)}</span> : null}
          </div>
          <div className="text-4xl font-bold tracking-[-1px] tabular-nums">
            {Math.floor(tracked / 3600)}:{String(Math.floor((tracked % 3600) / 60)).padStart(2, "0")}
          </div>
          <Link href={`/focus?task=${id}`} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border-hard bg-white text-sm font-semibold shadow-hard-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 4v16l13-8z" />
            </svg>
            Start focus session
          </Link>
        </section>
        <Activity taskId={id} rows={rows} />
      </aside>
    </div>
  );
}

export default function TaskPage(props: PageProps<"/tasks/[id]">) {
  return (
    <Suspense fallback={<div aria-hidden="true" className="h-96 animate-pulse rounded-card bg-panel motion-reduce:animate-none" />}>
      <Content {...props} />
    </Suspense>
  );
}
