import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { requireUserId } from "@/lib/auth/session";
import { getProjectOverview } from "@/services/projects";

function Kpi({ label, value, tone = "bg-white", children }: { label: string; value: string; tone?: string; children: ReactNode }) {
  return (
    <div className={`flex min-w-0 flex-col gap-2.5 rounded-[20px] border-hard p-4.5 shadow-hard-4 ${tone}`}>
      <span className="text-[13px]">{label}</span>
      <span className="text-3xl font-bold">{value}</span>
      {children}
    </div>
  );
}

async function Overview({ params }: PageProps<"/projects/[id]">) {
  const [userId, { id }] = await Promise.all([requireUserId(), params]);
  const project = await getProjectOverview(userId, id);
  if (!project) notFound();

  return (
    <>
      <header style={{ backgroundColor: project.color }} className="flex flex-col gap-4.5 rounded-card border-hard p-5.5 shadow-hard-5">
        <div className="flex flex-wrap items-center justify-between gap-3.5">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="flex size-14 flex-none items-center justify-center rounded-2xl border-hard bg-white">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={project.iconPath ?? ""} />
              </svg>
            </span>
            <div className="min-w-0">
              <div className="text-xs font-semibold tracking-[1px] uppercase">{[project.key, project.templateName].filter(Boolean).join(" · ")}</div>
              <h1 className="font-content text-3xl font-bold tracking-[-0.6px] break-words">{project.name}</h1>
            </div>
          </div>
          <Link href={`/tasks/new?project=${project.id}`} className="flex h-11 items-center gap-2 rounded-xl border-hard bg-ink px-4.5 text-sm font-semibold text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add task
          </Link>
        </div>
        {project.description && <p className="max-w-190 font-content text-sm leading-relaxed break-words whitespace-pre-wrap">{project.description}</p>}
      </header>

      <section aria-label="Project summary" className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Kpi label="Progress" value={`${project.percent}%`}>
          <div aria-hidden="true" className="h-2.5 overflow-hidden rounded-full border border-ink bg-[#f0f0ec]">
            <div style={{ width: `${project.percent}%` }} className="h-full bg-teal" />
          </div>
        </Kpi>
        <Kpi label="Tasks" value={`${project.done} / ${project.total}`}>
          <span className="text-xs text-[#3d3d3d]">{project.total ? `${project.open} open · ${project.overdue} overdue` : "No tasks yet"}</span>
        </Kpi>
        <Kpi label="Target date" value={project.targetLabel ?? "Not set"} tone="bg-sun-tint">
          {project.daysLabel && <span className="text-xs">{project.daysLabel}</span>}
        </Kpi>
      </section>
    </>
  );
}

function Skeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-5 motion-reduce:animate-none">
      <div className="h-32 rounded-card bg-panel" />
      <div className="h-32 rounded-[20px] bg-panel" />
    </div>
  );
}

export default function ProjectPage(props: PageProps<"/projects/[id]">) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Overview {...props} />
    </Suspense>
  );
}
