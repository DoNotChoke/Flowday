import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUserId } from "@/lib/auth/session";
import { isDate } from "@/lib/datetime";
import { listCategories } from "@/services/categories";
import { listProjects } from "@/services/projects";
import { TaskForm } from "./TaskForm";

export const metadata: Metadata = { title: "Flowday — New task" };

async function LoadedForm({ searchParams }: PageProps<"/tasks/new">) {
  const userId = await requireUserId();
  const [categories, projects, query] = await Promise.all([listCategories(userId), listProjects(userId), searchParams]);
  const projectId = projects.find((project) => project.id === query.project)?.id ?? "";

  const dueDate = typeof query.due === "string" && isDate(query.due) ? query.due : undefined;

  return <TaskForm categories={categories} projects={projects} projectId={projectId} dueDate={dueDate} />;
}

export default function NewTaskPage(props: PageProps<"/tasks/new">) {
  return (
    <>
      <header className="flex flex-wrap items-center gap-3.5">
        <Link href="/tasks" aria-label="Back" className="flex size-11.5 items-center justify-center rounded-control border-hard bg-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div>
          <div className="text-[13px] text-muted">My tasks / New</div>
          <h1 className="text-[28px] font-bold tracking-[-0.5px]">Create a new task</h1>
        </div>
      </header>
      <Suspense>
        <LoadedForm {...props} />
      </Suspense>
    </>
  );
}
