import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUserId } from "@/lib/auth/session";
import { getProject } from "@/services/projects";
import { ProjectForm } from "../../new/ProjectForm";
import { ArchiveButton } from "../ArchiveControls";

export const metadata: Metadata = { title: "Flowday — Edit project" };

async function Content({ params }: PageProps<"/projects/[id]/settings">) {
  const [userId, { id }] = await Promise.all([requireUserId(), params]);
  const project = await getProject(userId, id);
  if (!project) notFound();

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex min-w-0 items-center gap-3.5">
          <Link href={`/projects/${id}`} aria-label="Back to project" className="flex size-11.5 flex-none items-center justify-center rounded-control border-hard bg-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <div className="min-w-0">
            <div className="truncate font-content text-[13px] text-muted">{project.name}</div>
            <h1 className="text-[28px] font-bold tracking-[-0.5px]">Edit project</h1>
          </div>
        </div>
        {!project.archivedAt && <ArchiveButton id={id} />}
      </header>
      <ProjectForm project={project} />
    </>
  );
}

export default function ProjectSettingsPage(props: PageProps<"/projects/[id]/settings">) {
  return (
    <Suspense>
      <Content {...props} />
    </Suspense>
  );
}
