import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUserId } from "@/lib/auth/session";
import { listCategories } from "@/services/categories";
import { listProjects } from "@/services/projects";
import { getTaskDetail } from "@/services/tasks";
import { TaskFields } from "./TaskFields";

async function Content({ params }: PageProps<"/tasks/[id]">) {
  const userId = await requireUserId();
  const { id } = await params;
  const [task, categories, projects] = await Promise.all([getTaskDetail(userId, id), listCategories(userId), listProjects(userId)]);
  if (!task) notFound();

  return <TaskFields task={task} categories={categories} projects={projects} />;
}

export default function TaskPage(props: PageProps<"/tasks/[id]">) {
  return (
    <Suspense fallback={<div aria-hidden="true" className="h-96 animate-pulse rounded-card bg-panel motion-reduce:animate-none" />}>
      <Content {...props} />
    </Suspense>
  );
}
