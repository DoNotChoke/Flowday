"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Project = { id: string; name: string; color: string; taskCount: number };

export function ProjectLinks({ projects }: { projects: Project[] }) {
  const pathname = usePathname();

  if (projects.length === 0) return <p className="px-2.5 text-sm text-muted">No projects yet</p>;

  return projects.map((project) => {
    const href = `/projects/${project.id}`;
    const active = pathname === href;
    return (
      <Link
        key={project.id}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex h-10 flex-none items-center gap-3 rounded-xl border-[1.5px] px-3 text-sm pointer-coarse:min-h-11 ${active ? "border-ink bg-sun-tint font-semibold" : "border-transparent text-[#3d3d3d]"}`}
      >
        <span style={{ backgroundColor: project.color }} className="size-2.5 flex-none rounded-[3px] border border-ink" />
        <span className="min-w-0 flex-1 truncate font-content">{project.name}</span>
        <span className="text-xs text-muted">{project.taskCount}</span>
      </Link>
    );
  });
}
