import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUserId } from "@/lib/auth/session";
import { isDate, utcToZoned } from "@/lib/datetime";
import { getCalendar, listUnscheduled, monthGrid } from "@/services/calendar";
import { getTimeZone } from "@/services/tasks";
import { Planner } from "./Planner";

export const metadata: Metadata = { title: "Flowday — Calendar" };

const format = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(Date.parse(date));

function firstOfMonth(date: string, offset: number) {
  const [year, month] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 10);
}

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
  const month = monthGrid(selected);
  const [items, unscheduled] = await Promise.all([getCalendar(userId, timeZone, month[0], month[41]), listUnscheduled(userId)]);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[26px] font-bold tracking-[-0.6px] md:text-3xl">{format(selected, { month: "long", year: "numeric" })}</h1>
          <nav aria-label="Months" className="flex gap-1.5">
            <Link href={`/calendar?date=${firstOfMonth(selected, -1)}`} aria-label="Previous month" className={navClass}>
              <Chevron path="M15 18l-6-6 6-6" />
            </Link>
            <Link href={`/calendar?date=${firstOfMonth(selected, 1)}`} aria-label="Next month" className={navClass}>
              <Chevron path="M9 6l6 6-6 6" />
            </Link>
            <Link href="/calendar" className={`${navClass} px-3.5`}>
              Today
            </Link>
          </nav>
        </div>
      </header>

      <Planner days={month} today={today} selected={selected} items={items} unscheduled={unscheduled} />
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
