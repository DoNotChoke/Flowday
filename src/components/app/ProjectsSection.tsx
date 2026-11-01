import Link from "next/link";
import { Suspense } from "react";
import { requireUserId } from "@/lib/auth/session";
import { listProjects } from "@/services/projects";
import { ProjectLinks } from "./ProjectLinks";

async function ProjectList() {
  const userId = await requireUserId();

  return <ProjectLinks projects={await listProjects(userId)} />;
}

export function ProjectsSection() {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between pr-1 pb-1.5 pl-2.5">
        <span className="text-[11px] font-semibold tracking-[1px] text-muted">PROJECTS</span>
        <Link
          href="/projects/new"
          aria-label="New project"
          className="flex size-7.5 items-center justify-center rounded-lg border-hard pointer-coarse:size-11"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
      </div>
      <Suspense>
        <ProjectList />
      </Suspense>
    </div>
  );
}
