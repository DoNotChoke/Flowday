import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUserId } from "@/lib/auth/session";
import { relativeTime } from "@/lib/datetime";
import { listActivity } from "@/services/activity";
import { listCategories } from "@/services/categories";
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
  const [task, categories, projects, subtasks, activity] = await Promise.all([
    getTaskDetail(userId, id),
    listCategories(userId),
    listProjects(userId),
    listSubtasks(userId, id),
    listActivity(userId, id),
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
      <Activity taskId={id} rows={rows} />
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
