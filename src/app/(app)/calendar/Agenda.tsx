import Link from "next/link";
import { estimateLabel } from "@/lib/progress";
import type { CalendarItem } from "@/services/calendar";

type AgendaProps = { date: string; today: string; items: CalendarItem[] };

export function Agenda({ date, today, items }: AgendaProps) {
  const format = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(Date.parse(date));
  const title = format({ month: "long", day: "numeric" });

  return (
    <section aria-label="Agenda" className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 rounded-card border-hard bg-white p-5.5 shadow-hard-5">
      <div className="flex items-start justify-between gap-2.5">
        <div>
          <div className="text-[13px] text-muted">
            {format({ weekday: "long" })}
            {date === today && " · Today"}
          </div>
          <h2 className="text-[22px] font-bold">{title}</h2>
        </div>
        <Link href={`/tasks/new?due=${date}`} aria-label={`Add task on ${title}`} className="flex size-11 items-center justify-center rounded-xl border-hard bg-coral shadow-hard-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
      </div>

      {items.length ? (
        <ol className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-stretch gap-3">
              <span className="w-11.5 flex-none pt-3 text-xs font-semibold text-[#3d3d3d]">{item.time ?? "All day"}</span>
              <Link
                href={`/tasks/${item.id}`}
                className={`flex min-w-0 flex-1 flex-col gap-1 rounded-control border-hard px-3.5 py-3 ${item.status === "completed" ? "opacity-60" : ""}`}
                style={{ backgroundColor: item.color ? `${item.color}33` : "#eeeeea" }}
              >
                <span className={`font-content text-sm font-semibold ${item.status === "completed" ? "line-through" : ""}`}>{item.title}</span>
                <span className="text-xs text-[#3d3d3d]">
                  {[item.category && <span key="category" className="font-content">{item.category}</span>, item.kind === "due" ? "Due" : "Planned", item.estimateMin ? estimateLabel(item.estimateMin) : null]
                    .filter(Boolean)
                    .flatMap((part, index) => (index ? [" · ", part] : [part]))}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-control border-[1.5px] border-dashed border-[#9c9c96] p-6 text-center text-[13px] text-muted">Nothing planned. A free day.</p>
      )}
    </section>
  );
}
