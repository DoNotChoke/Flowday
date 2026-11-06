"use client";

import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";

type Day = { day: string; tasks: number; sessions: number };

const levels = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"];
const level = (count: number) => (count === 0 ? 0 : count <= 2 ? 1 : count <= 4 ? 2 : count <= 6 ? 3 : 4);
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
const long = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const describe = ({ day, tasks, sessions }: Day) => `${long.format(Date.parse(day))}: ${plural(tasks, "task")}, ${plural(sessions, "focus session")}`;
const keySteps: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 };
// The header row, then Monday to Sunday.
const rowLabels = ["", "Mon", "", "Wed", "", "Fri", "", ""];

export function Heatmap({ days }: { days: Day[] }) {
  const today = days.length - 1;
  // The day under the pointer, the keyboard or a tap; none once they leave, so no ring is left behind.
  const [selected, setSelected] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const cells = useRef<(HTMLButtonElement | null)[]>([]);

  // Phones see the latest weeks first.
  useEffect(() => {
    scroller.current?.scrollTo({ left: scroller.current.scrollWidth });
  }, []);

  function move(event: KeyboardEvent, index: number) {
    const step = keySteps[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const target = Math.min(today, Math.max(0, index + step));
    setSelected(target);
    cells.current[target]?.focus();
  }

  function leave(event: FocusEvent) {
    if (!event.currentTarget.contains(event.relatedTarget)) setSelected(null);
  }

  // A month label sits over the first week that starts in that month; it takes one column and spills over the next,
  // since spanning more would add columns. None in the last two weeks, where the text would run past the edge.
  const months = days.flatMap((entry, index) =>
    index % 7 === 0 && index < days.length - 14 && (index === 0 || entry.day.slice(5, 7) !== days[index - 7].day.slice(5, 7))
      ? [{ week: index / 7, label: new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(Date.parse(entry.day)) }]
      : [],
  );
  const shown = selected ?? today;

  return (
    <div className="flex flex-col gap-3">
      {/* The padding keeps the outline of today and the ring of a picked day inside the scroll box, which clips anything past its edge. */}
      <div ref={scroller} className="-m-1 overflow-x-auto p-1">
        {/* Wide screens share the width among the weeks; smaller ones keep 16px squares and scroll under sticky weekday labels. */}
        <div
          role="group"
          aria-label="Activity per day over the last 53 weeks"
          onMouseLeave={() => setSelected(null)}
          onBlur={leave}
          className="grid w-max grid-cols-[auto_repeat(53,16px)] gap-[3px] xl:w-auto xl:grid-cols-[auto_repeat(53,minmax(12px,1fr))]"
        >
          {months.map((month) => (
            <span key={month.week} aria-hidden="true" style={{ gridColumn: month.week + 2, gridRow: 1 }} className="text-[11px] whitespace-nowrap text-muted md:text-xs">
              {month.label}
            </span>
          ))}
          {rowLabels.map((label, row) => (
            <span key={row} aria-hidden="true" style={{ gridColumn: 1, gridRow: row + 1 }} className="sticky left-0 z-10 flex items-center bg-white pr-1.5 text-[11px] text-muted md:text-xs">
              {label}
            </span>
          ))}
          {days.map((entry, index) => (
            <button
              key={entry.day}
              ref={(element) => {
                cells.current[index] = element;
              }}
              type="button"
              tabIndex={index === shown ? 0 : -1}
              aria-label={describe(entry)}
              aria-pressed={index === selected}
              onClick={() => setSelected(index)}
              onMouseEnter={() => setSelected(index)}
              onFocus={() => setSelected(index)}
              onKeyDown={(event) => move(event, index)}
              style={{ gridColumn: Math.floor(index / 7) + 2, gridRow: (index % 7) + 2 }}
              className={`aspect-square w-full rounded-[4px] ${levels[level(entry.tasks + entry.sessions)]} ${index === today ? "outline-[1.5px] outline-ink" : ""} ${index === selected ? "ring-2 ring-coral ring-offset-1" : ""}`}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted">
        <span aria-live="polite" className="font-medium text-ink">
          {describe(days[shown])}
        </span>
        <span aria-hidden="true" className="flex items-center gap-1">
          Less
          {levels.map((tone) => (
            <span key={tone} className={`size-3.5 rounded-[4px] ${tone}`} />
          ))}
          More
        </span>
      </div>
    </div>
  );
}
