import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Board } from "@/components/app/board/Board";
import { columns } from "@/components/app/board/columns";
import { requireUserId } from "@/lib/auth/session";
import { getBoard } from "@/services/board";
import { listMilestones } from "@/services/milestones";
import { getProjectOverview } from "@/services/projects";
import { RestoreButton } from "./ArchiveControls";
import { Milestones } from "./Milestones";
import { ProjectTasks } from "./ProjectTasks";

const views = [
  { value: "overview", label: "Overview", search: "" },
  { value: "board", label: "Board", search: "?view=board" },
  { value: "list", label: "List", search: "?view=list" },
] as const;

function Kpi({ label, value, tone = "bg-white", children }: { label: string; value: string; tone?: string; children: ReactNode }) {
  return (
    <div className={`flex min-w-0 flex-col gap-2.5 rounded-[20px] border-hard p-4.5 shadow-hard-4 ${tone}`}>
      <span className="text-[13px]">{label}</span>
      <span className="text-3xl font-bold">{value}</span>
      {children}
    </div>
  );
}

async function Overview({ params, searchParams }: PageProps<"/projects/[id]">) {
  const [userId, { id }, query] = await Promise.all([requireUserId(), params, searchParams]);
  const [project, board, milestones] = await Promise.all([getProjectOverview(userId, id), getBoard(userId, { projectId: id }), listMilestones(userId, id)]);
  if (!project) notFound();
  const status = columns.find((column) => column.status === query.status)?.status;
  const view = views.find((option) => option.value === query.view)?.value ?? "overview";

  return (
    <>
      {project.archivedAt && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border-hard bg-stone-tint px-4 py-3">
          <span className="text-sm font-medium">This project is archived. It is hidden from the sidebar and its tasks stay on your board.</span>
          <RestoreButton id={project.id} />
        </div>
      )}
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
          <div className="flex items-center gap-2.5">
            <Link href={`/projects/${project.id}/settings`} aria-label="Project settings" className="flex size-11 items-center justify-center rounded-xl border-hard bg-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
              </svg>
            </Link>
            <Link href={`/tasks/new?project=${project.id}`} className="flex h-11 items-center gap-2 rounded-xl border-hard bg-ink px-4.5 text-sm font-semibold text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add task
            </Link>
          </div>
        </div>
        {project.description && <p className="max-w-190 font-content text-sm leading-relaxed break-words whitespace-pre-wrap">{project.description}</p>}
        <nav aria-label="Project views" className="flex flex-wrap gap-1.5">
          {views.map((option) => (
            <Link
              key={option.value}
              href={`/projects/${project.id}${option.search}`}
              aria-current={view === option.value ? "page" : undefined}
              className={`flex h-9.5 items-center rounded-[10px] border-hard px-4 text-[13px] font-semibold pointer-coarse:min-h-11 ${view === option.value ? "bg-ink text-white" : "bg-white"}`}
            >
              {option.label}
            </Link>
          ))}
        </nav>
      </header>

      {view === "overview" ? (
        <>
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

          <Milestones projectId={project.id} milestones={milestones} />

          <ProjectTasks projectId={project.id} projectName={project.name} tasks={board.tasks} status={status} />
        </>
      ) : (
        <Board tasks={board.tasks} view={view} />
      )}
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
