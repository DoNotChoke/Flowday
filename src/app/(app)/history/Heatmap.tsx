"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

type Day = { day: string; tasks: number; sessions: number };

const levels = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"];
const level = (count: number) => (count === 0 ? 0 : count <= 2 ? 1 : count <= 4 ? 2 : count <= 6 ? 3 : 4);
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
const long = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const describe = ({ day, tasks, sessions }: Day) => `${long.format(Date.parse(day))}: ${plural(tasks, "task")}, ${plural(sessions, "focus session")}`;
const keySteps: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 };

export function Heatmap({ days }: { days: Day[] }) {
  const [selected, setSelected] = useState(days.length - 1);
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
    const target = Math.min(days.length - 1, Math.max(0, index + step));
    setSelected(target);
    cells.current[target]?.focus();
  }

  // A month label sits over the first week that starts in that month.
  const months = days.flatMap((entry, index) =>
    index % 7 === 0 && (index === 0 || entry.day.slice(5, 7) !== days[index - 7].day.slice(5, 7))
      ? [{ column: index / 7 + 1, label: new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(Date.parse(entry.day)) }]
      : [],
  );

  return (
    <div className="flex flex-col gap-3">
      <div ref={scroller} className="overflow-x-auto pb-1">
        <div className="flex w-max gap-2">
          <div aria-hidden="true" className="mt-5 grid grid-rows-[repeat(7,11px)] gap-[3px] text-[10px] leading-[11px] text-muted lg:grid-rows-[repeat(7,14px)] lg:leading-[14px]">
            <span />
            <span>Mon</span>
            <span />
            <span>Wed</span>
            <span />
            <span>Fri</span>
            <span />
          </div>
          <div>
            <div aria-hidden="true" className="grid h-5 auto-cols-[11px] grid-flow-col gap-[3px] lg:auto-cols-[14px] text-[10px] text-muted">
              {months.map((month) => (
                <span key={month.column} style={{ gridColumnStart: month.column }} className="whitespace-nowrap">
                  {month.label}
                </span>
              ))}
            </div>
            <div role="group" aria-label="Activity per day over the last 53 weeks" className="grid auto-cols-[11px] grid-flow-col grid-rows-[repeat(7,11px)] gap-[3px] lg:auto-cols-[14px] lg:grid-rows-[repeat(7,14px)]">
              {days.map((entry, index) => (
                <button
                  key={entry.day}
                  ref={(element) => {
                    cells.current[index] = element;
                  }}
                  type="button"
                  tabIndex={index === selected ? 0 : -1}
                  aria-label={describe(entry)}
                  aria-pressed={index === selected}
                  onClick={() => setSelected(index)}
                  onMouseEnter={() => setSelected(index)}
                  onFocus={() => setSelected(index)}
                  onKeyDown={(event) => move(event, index)}
                  className={`size-[11px] rounded-[3px] lg:size-[14px] ${levels[level(entry.tasks + entry.sessions)]} ${index === days.length - 1 ? "outline-[1.5px] outline-ink" : ""} ${index === selected ? "ring-2 ring-coral ring-offset-1" : ""}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span aria-live="polite" className="font-medium text-ink">
          {describe(days[selected])}
        </span>
        <span aria-hidden="true" className="flex items-center gap-1">
          Less
          {levels.map((tone) => (
            <span key={tone} className={`size-[11px] rounded-[3px] ${tone}`} />
          ))}
          More
        </span>
      </div>
    </div>
  );
}
