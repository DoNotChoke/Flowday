import Link from "next/link";
import type { ComponentProps } from "react";
import type { getBoard } from "@/services/board";
import { percentDone } from "@/lib/progress";

export type Card = Awaited<ReturnType<typeof getBoard>>["tasks"][number];

const priorities = {
  urgent: { label: "Urgent", tone: "bg-coral-tint", dot: "#e0492c" },
  high: { label: "High", tone: "bg-sun-tint", dot: "#d99a00" },
  medium: { label: "Medium", tone: "bg-blue-tint", dot: "#3a6fd8" },
  low: { label: "Low", tone: "bg-stone-tint", dot: "#7a7a7a" },
};

type TaskCardProps = { card: Card; color: string } & Omit<ComponentProps<typeof Link>, "href" | "className">;

export function TaskCard({ card, color, ...link }: TaskCardProps) {
  const percent = percentDone(card.status, card.subtasksDone, card.subtasksTotal);
  const priority = priorities[card.priority];
  const canceled = card.status === "canceled";
  const ring = canceled ? "#b5b5b0" : color;

  return (
    <Link {...link} href={`/tasks/${card.id}`} className="flex touch-manipulation flex-col gap-3 rounded-[18px] border-hard bg-white p-4 shadow-hard-4 select-none [-webkit-touch-callout:none]">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate rounded-full bg-[#f0f0ec] px-2.5 py-1 font-content text-[11px] font-medium">
          {card.categories.join(" · ") || "No category"}
        </span>
        <span className={`flex flex-none items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${priority.tone}`}>
          <span style={{ backgroundColor: priority.dot }} className="size-1.75 rounded-full" />
          {priority.label}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className={`font-content text-[15px] leading-snug font-semibold break-words ${canceled ? "line-through" : ""}`}>{card.title}</div>
          <div className="mt-0.5 truncate font-content text-xs text-muted">
            {[card.code, card.projectName].filter(Boolean).join(" · ") || "No project"}
          </div>
        </div>
        <span
          style={{ background: `conic-gradient(${ring} 0 ${percent}%, #ececE8 0)` }}
          className="flex size-12 flex-none items-center justify-center rounded-full"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-white text-[11px] font-semibold">{percent}%</span>
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-dashed border-[#d6d6d1] pt-2.5 text-xs text-[#3d3d3d]">
        <span>
          {card.subtasksDone}/{card.subtasksTotal}
        </span>
        {card.dueLabel && <span className={card.dueToday ? "font-semibold text-danger" : ""}>{card.dueLabel}</span>}
      </div>
    </Link>
  );
}
