import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUserId } from "@/lib/auth/session";
import { isDate, utcToZoned } from "@/lib/datetime";
import { addDays, getCalendar, listUnscheduled, monthGrid, weekDays } from "@/services/calendar";
import { getTimeZone } from "@/services/tasks";
import { Planner } from "./Planner";

export const metadata: Metadata = { title: "Flowday — Calendar" };

const format = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(Date.parse(date));

function firstOfMonth(date: string, offset: number) {
  const [year, month] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 10);
}

const views = ["day", "week", "month"] as const;

const navClass = "flex h-10 min-w-10 items-center justify-center rounded-xl border-hard bg-white text-[13px] font-medium pointer-coarse:min-h-11 pointer-coarse:min-w-11";

function Chevron({ path }: { path: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

async function Content({ searchParams }: PageProps<"/calendar">) {
  const userId = await requireUserId();
  const query = await searchParams;
  const timeZone = await getTimeZone(userId);
  const today = utcToZoned(new Date(), timeZone).date;
  const selected = typeof query.date === "string" && isDate(query.date) ? query.date : today;
  const view = views.find((option) => option === query.view) ?? "month";
  const days = view === "month" ? monthGrid(selected) : view === "week" ? weekDays(selected) : [selected];
  const [items, unscheduled] = await Promise.all([getCalendar(userId, timeZone, days[0], days.at(-1)!), listUnscheduled(userId)]);

  const href = (date: string | null, to = view) => {
    const params = new URLSearchParams({ ...(to !== "month" && { view: to }), ...(date && { date }) }).toString();
    return params ? `/calendar?${params}` : "/calendar";
  };
  const step = (offset: number) => (view === "month" ? firstOfMonth(selected, offset) : addDays(selected, offset * (view === "week" ? 7 : 1)));
  const title =
    view === "month"
      ? format(selected, { month: "long", year: "numeric" })
      : view === "week"
        ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).formatRange(Date.parse(days[0]), Date.parse(days[6]))
        : format(selected, { month: "long", day: "numeric", year: "numeric" });

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[26px] font-bold tracking-[-0.6px] md:text-3xl">{title}</h1>
          <nav aria-label="Dates" className="flex gap-1.5">
            <Link href={href(step(-1))} aria-label={`Previous ${view}`} className={navClass}>
              <Chevron path="M15 18l-6-6 6-6" />
            </Link>
            <Link href={href(step(1))} aria-label={`Next ${view}`} className={navClass}>
              <Chevron path="M9 6l6 6-6 6" />
            </Link>
            <Link href={href(null)} className={`${navClass} px-3.5`}>
              Today
            </Link>
          </nav>
        </div>
        <div role="group" aria-label="Calendar view" className="flex items-center gap-1 rounded-xl border-hard bg-white p-0.75">
          {views.map((option) => (
            <Link
              key={option}
              href={href(selected, option)}
              aria-current={view === option ? "true" : undefined}
              className={`flex h-8.5 items-center rounded-[9px] px-3.5 text-[13px] capitalize pointer-coarse:min-h-11 ${view === option ? "bg-sun-tint font-semibold" : ""}`}
            >
              {option}
            </Link>
          ))}
        </div>
      </header>

      <Planner view={view} days={days} today={today} selected={selected} items={items} unscheduled={unscheduled} />
    </>
  );
}

function Skeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-6 motion-reduce:animate-none">
      <div className="h-10 w-64 rounded-control bg-panel" />
      <div className="h-[640px] rounded-card bg-panel" />
    </div>
  );
}

export default function CalendarPage(props: PageProps<"/calendar">) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Content {...props} />
    </Suspense>
  );
}
