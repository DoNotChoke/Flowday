import type { Metadata } from "next";
import Link from "next/link";
import { ProjectForm } from "./ProjectForm";

export const metadata: Metadata = { title: "Flowday — New project" };

export default function NewProjectPage() {
  return (
    <>
      <header className="flex flex-wrap items-center gap-3.5">
        <Link href="/tasks" aria-label="Back" className="flex size-11.5 items-center justify-center rounded-control border-hard bg-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div>
          <div className="text-[13px] text-muted">Projects / New</div>
          <h1 className="text-[28px] font-bold tracking-[-0.5px]">Create a new project</h1>
        </div>
      </header>
      <ProjectForm />
    </>
  );
}
