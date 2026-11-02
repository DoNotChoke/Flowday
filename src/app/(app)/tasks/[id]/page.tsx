import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUserId } from "@/lib/auth/session";
import { listCategories } from "@/services/categories";
import { listProjects } from "@/services/projects";
import { listSubtasks } from "@/services/subtasks";
import { getTaskDetail } from "@/services/tasks";
import { Checklist } from "./Checklist";
import { TaskFields } from "./TaskFields";

async function Content({ params }: PageProps<"/tasks/[id]">) {
  const userId = await requireUserId();
  const { id } = await params;
  const [task, categories, projects, subtasks] = await Promise.all([getTaskDetail(userId, id), listCategories(userId), listProjects(userId), listSubtasks(userId, id)]);
  if (!task) notFound();

  return (
    <TaskFields task={task} categories={categories} projects={projects}>
      <Checklist taskId={id} subtasks={subtasks} />
    </TaskFields>
  );
}

export default function TaskPage(props: PageProps<"/tasks/[id]">) {
  return (
    <Suspense fallback={<div aria-hidden="true" className="h-96 animate-pulse rounded-card bg-panel motion-reduce:animate-none" />}>
      <Content {...props} />
    </Suspense>
  );
}
