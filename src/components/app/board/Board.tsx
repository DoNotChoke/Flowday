import Link from "next/link";
import type { getBoard } from "@/services/board";
import { TaskCard } from "./TaskCard";

const columns = [
  { status: "ongoing", name: "On going", color: "#5b8def", tone: "bg-blue", icon: "M21 12a9 9 0 0 1-15.5 6.3M3 12a9 9 0 0 1 15.5-6.3M21 4v5h-5M3 20v-5h5" },
  { status: "in_process", name: "In process", color: "#ffc94a", tone: "bg-sun", icon: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" },
  { status: "completed", name: "Completed", color: "#4fc1be", tone: "bg-teal", icon: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M9 15l2 2 4-4" },
  { status: "canceled", name: "Canceled", color: "#f47258", tone: "bg-coral", icon: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M10 13l4 4M14 13l-4 4" },
] as const;

export function StatusCards({ stats }: { stats: Awaited<ReturnType<typeof getBoard>>["stats"] }) {
  return (
    <section aria-label="Task status" className="grid grid-cols-1 gap-4.5 md:grid-cols-2 xl:grid-cols-4">
      {columns.map((column) => (
        <div key={column.status} className={`flex items-center gap-3.5 rounded-[20px] border-hard p-4.5 shadow-hard-5 ${column.tone}`}>
          <span className="flex size-12 flex-none items-center justify-center rounded-full border-[1.5px] border-ink/25 bg-white/40">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={column.icon} />
            </svg>
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-semibold">{column.name}</span>
            <span className="text-[13px]">{stats[column.status].count} Tasks</span>
          </span>
          <span className="rounded-full bg-white/55 px-2.5 py-1 text-xs font-semibold">{stats[column.status].delta}</span>
        </div>
      ))}
    </section>
  );
}

export function Board({ tasks }: { tasks: Awaited<ReturnType<typeof getBoard>>["tasks"] }) {
  return (
    <section aria-label="Board" className="grid items-start gap-4.5 md:grid-cols-2 xl:grid-cols-4">
      {columns.map((column) => {
        const cards = tasks.filter((task) => task.status === column.status);
        const headingId = `column-${column.status}`;
        return (
          <section key={column.status} aria-labelledby={headingId} className="flex min-w-0 flex-col gap-3.5 rounded-[22px] bg-panel p-3.5">
            <div className="flex items-center gap-2.5 px-1 py-0.5">
              <span style={{ backgroundColor: column.color }} className="size-3 rounded border-hard" />
              <h2 id={headingId} className="flex-1 text-[15px] font-semibold">
                {column.name}
              </h2>
              <span className="rounded-full border border-ink bg-white px-2.25 py-px text-xs font-semibold">{cards.length}</span>
              <Link href="/tasks/new" aria-label={`Add task to ${column.name}`} className="flex size-8 items-center justify-center rounded-[9px] pointer-coarse:size-11">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </Link>
            </div>
            {cards.map((card) => (
              <TaskCard key={card.id} card={card} color={column.color} />
            ))}
            {cards.length === 0 && <p className="rounded-2xl border-[1.5px] border-dashed border-[#9c9c96] p-5 text-center text-[13px] text-muted">No tasks here</p>}
          </section>
        );
      })}
    </section>
  );
}
