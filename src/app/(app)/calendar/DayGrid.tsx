"use client";

import { useDroppable } from "@dnd-kit/core";
import Link from "next/link";
import type { ReactNode } from "react";
import { Flame } from "@/components/app/Flame";
import type { CalendarItem } from "@/services/calendar";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const NO_COLOR = "#9c9c96";

// A day is a link to its agenda and a place to drop an unscheduled task.
function DayCell({ href, day, label, current, className, children }: { href: string; day: string; label: string; current: boolean; className: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: day });

  return (
    <Link ref={setNodeRef} href={href} scroll={false} aria-label={label} aria-current={current ? "date" : undefined} className={`${className} ${isOver ? "outline-2 outline-offset-1 outline-coral" : ""}`}>
      {children}
    </Link>
  );
}

type DayGridProps = { view: "month" | "week"; days: string[]; today: string; selected: string; byDay: Map<string, CalendarItem[]>; streakDays: Set<string> };

// The month as 6 rows of 7 days, or one week with every task written out (a list on phones).
export function DayGrid({ view, days, today, selected, byDay, streakDays }: DayGridProps) {
  const label = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
  const week = view === "week";
  const month = week ? "" : selected.slice(0, 7);

  return (
    <section aria-label={week ? "Week" : "Month"} className="min-w-0 flex-[3_1_560px] md:rounded-card md:border-hard md:bg-white md:p-4.5 md:shadow-hard-5">
      <div className={`grid ${week ? "grid-cols-1 gap-2 md:grid-cols-7 md:gap-1.5" : "grid-cols-7 gap-0.5 md:gap-1.5"}`}>
        {weekdays.map((weekday) => (
          <div key={weekday} aria-hidden="true" className={`pb-2 text-center text-xs font-semibold text-muted ${week ? "hidden md:block" : ""}`}>
            {weekday}
          </div>
        ))}
        {days.map((day) => {
          const items = byDay.get(day) ?? [];
          const inMonth = day.startsWith(month);
          const isSelected = day === selected;
          const isToday = day === today;
          const streak = streakDays.has(day);
          const name = `${label.format(Date.parse(day))}${isToday ? ", today" : ""}, ${items.length} ${items.length === 1 ? "task" : "tasks"}${streak ? ", streak day" : ""}`;

          return (
            <DayCell
              key={day}
              href={`/calendar?${week ? "view=week&" : ""}date=${day}`}
              day={day}
              label={name}
              current={isSelected}
              className={`flex min-w-0 flex-col gap-1 border-[1.5px] ${week ? "min-h-14 items-stretch rounded-control p-2 md:min-h-60" : "min-h-11 items-center rounded-[10px] p-1 md:min-h-26 md:items-stretch md:rounded-control md:p-2"} ${
                isSelected ? "border-ink bg-sun-tint shadow-hard-3" : `border-[#e4e4df] ${inMonth ? "bg-white" : "bg-[#f7f7f4] text-muted"}`
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={`flex size-6.5 items-center justify-center rounded-full text-[13px] font-semibold ${isToday ? "bg-ink text-white" : ""}`}>
                  {Number(day.slice(8))}
                </span>
                {streak && (
                  <span aria-hidden="true" className={week ? "ml-auto" : "ml-auto hidden md:block"}>
                    <Flame size={14} lit />
                  </span>
                )}
                {week && (
                  <span aria-hidden="true" className="text-xs font-semibold text-muted md:hidden">
                    {weekdays[(new Date(day).getUTCDay() + 6) % 7]}
                  </span>
                )}
              </span>
              <span aria-hidden="true" className={week ? "hidden" : "flex gap-0.5 md:hidden"}>
                {items.slice(0, 3).map((item) => (
                  <span key={item.id} className="size-1.5 rounded-full" style={{ backgroundColor: item.color ?? NO_COLOR }} />
                ))}
              </span>
              {items.slice(0, week ? undefined : 2).map((item) => (
                <span
                  key={item.id}
                  aria-hidden="true"
                  className={`${week ? "block break-words" : "hidden truncate md:block"} rounded-md border-l-3 px-1.5 py-0.75 font-content text-[11px] leading-[1.3] font-medium text-ink ${item.status === "completed" ? "line-through opacity-60" : ""}`}
                  style={{ borderLeftColor: item.color ?? NO_COLOR, backgroundColor: `${item.color ?? NO_COLOR}33` }}
                >
                  {item.title}
                </span>
              ))}
              {!week && items.length > 2 && (
                <span aria-hidden="true" className="hidden pl-1 text-[11px] text-muted md:block">
                  +{items.length - 2} more
                </span>
              )}
            </DayCell>
          );
        })}
      </div>
    </section>
  );
}
