import Link from "next/link";
import { percentDone } from "@/lib/progress";
import { columns } from "./columns";
import { MoveButton } from "./MoveMenu";
import { priorities, type Card } from "./TaskCard";

export function TaskList({ cards, onMove }: { cards: Card[]; onMove: (card: Card) => void }) {
  if (cards.length === 0) {
    return <p className="rounded-2xl border-[1.5px] border-dashed border-[#9c9c96] p-5 text-center text-[13px] text-muted">No tasks here</p>;
  }

  return (
    <ul aria-label="Tasks" className="flex flex-col gap-3">
      {columns.flatMap((column) =>
        cards
          .filter((card) => card.status === column.status)
          .map((card) => (
            <li key={card.id} className="flex flex-col gap-3 rounded-[18px] border-hard bg-white p-4 shadow-hard-3 md:flex-row md:items-center">
              <Link href={`/tasks/${card.id}`} className="min-w-0 flex-1 font-content">
                <span className={`block text-[15px] leading-snug font-semibold break-words ${card.status === "canceled" ? "line-through" : ""}`}>{card.title}</span>
                <span className="block truncate text-xs text-muted">{[card.code, card.projectName].filter(Boolean).join(" · ") || "No project"}</span>
              </Link>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-ink bg-white px-2.5 py-1 font-semibold">{column.name}</span>
                <span className={`rounded-full px-2.5 py-1 font-semibold ${priorities[card.priority].tone}`}>{priorities[card.priority].label}</span>
                {card.dueLabel && <span className={card.dueToday ? "font-semibold text-danger" : ""}>{card.dueLabel}</span>}
                <span className="font-semibold">{percentDone(card.status, card.subtasksDone, card.subtasksTotal)}%</span>
                <MoveButton card={card} onClick={() => onMove(card)} />
              </div>
            </li>
          )),
      )}
    </ul>
  );
}
