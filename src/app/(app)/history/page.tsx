import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { requireUserId } from "@/lib/auth/session";
import { estimateLabel } from "@/lib/progress";
import { relativeTime } from "@/lib/datetime";
import { focusByCategory, getDailyOverview, getHeatmap, getStreak, getSummary, recentlyCompleted } from "@/services/stats";
import { getTimeZone } from "@/services/tasks";
import { DailyChart } from "./DailyChart";
import { Heatmap } from "./Heatmap";
import { StreakCard } from "./StreakCard";

export const metadata: Metadata = { title: "Flowday — Work history" };

function Kpi({ label, value, sub, tint, icon }: { label: string; value: string; sub: ReactNode; tint: string; icon: string }) {
  return (
    <section aria-label={label} className="flex flex-col justify-between gap-3 rounded-card border-hard bg-white p-5 shadow-hard-5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-muted">{label}</span>
        <span className={`flex size-8.5 items-center justify-center rounded-[10px] border-hard ${tint}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={icon} />
          </svg>
        </span>
      </div>
      <span className="text-[34px] font-bold tracking-[-0.8px]">{value}</span>
      <span className="text-xs font-medium text-[#1f6b67]">{sub}</span>
    </section>
  );
}

const hours = (seconds: number) => `${Math.round((seconds / 3600) * 10) / 10}h`;
const duration = (seconds: number) => (seconds >= 3600 ? hours(seconds) : `${Math.round(seconds / 60)}m`);
const signed = (change: number) => `${change > 0 ? "+" : ""}${change}%`;

async function Content() {
  const userId = await requireUserId();
  const [streak, summary, heatmap, overview, categories, recent, timeZone] = await Promise.all([
    getStreak(userId),
    getSummary(userId, "month"),
    getHeatmap(userId),
    getDailyOverview(userId, "month"),
    focusByCategory(userId, "month"),
    recentlyCompleted(userId),
    getTimeZone(userId),
  ]);
  const most = categories[0]?.seconds ?? 0;
  const now = new Date();
  const perDay = Math.round(summary.focusPerDay / 60);

  return (
    <>
      <div className="grid grid-cols-1 gap-4.5 md:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
        <StreakCard {...streak} />
        <Kpi
          label="Completion rate"
          value={summary.completionRate === null ? "—" : `${summary.completionRate}%`}
          sub={summary.completionRate === null ? "No tasks created in the last 30 days" : summary.completionChange === null ? "Of tasks created in the last 30 days" : `${signed(summary.completionChange)} vs the 30 days before`}
          tint="bg-teal-tint"
          icon="M22 12h-4l-3 9L9 3l-3 9H2"
        />
        <Kpi
          label="Focus hours"
          value={hours(summary.focusSeconds)}
          sub={`≈ ${perDay ? estimateLabel(perDay) : "0m"} per day over 30 days`}
          tint="bg-blue-tint"
          icon="M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"
        />
      </div>

      <section aria-label="Activity over the last year" className="flex min-w-0 flex-col gap-4 rounded-card border-hard bg-white p-5.5 shadow-hard-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">
            {heatmap.tasks} {heatmap.tasks === 1 ? "task" : "tasks"} completed in the last year
          </h2>
          <span className="text-[13px] text-muted">
            Longest streak: {streak.longest} {streak.longest === 1 ? "day" : "days"}
            {heatmap.mostActive && ` · Most active: ${heatmap.mostActive}`}
          </span>
        </div>
        <Heatmap days={heatmap.days} />
      </section>

      <div className="grid grid-cols-1 gap-4.5 lg:grid-cols-[2fr_1fr]">
        <section aria-label="Daily tasks overview" className="flex min-w-0 flex-col gap-3 rounded-card border-hard bg-white p-5.5 shadow-hard-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Daily tasks overview</h2>
            <div className="flex gap-3.5 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-4 rounded-full bg-[#3fb3ad]" />
                Completed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-4 rounded-full bg-[#e0a800]" />
                Created
              </span>
            </div>
          </div>
          <DailyChart points={overview} period="the last 30 days" />
        </section>

        <section aria-label="Time by category" className="flex min-w-0 flex-col gap-3.5 rounded-card border-hard bg-white p-5.5 shadow-hard-5">
          <h2 className="text-lg font-semibold">Time by category</h2>
          {categories.length ? (
            <ul className="flex flex-col gap-3">
              {categories.map((category) => (
                <li key={category.name} className="flex flex-col gap-1.5 text-[13px]">
                  <div className="flex justify-between gap-2">
                    <span className="truncate font-content">{category.name}</span>
                    <span className="font-semibold tabular-nums">{duration(category.seconds)}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-panel">
                    <div className="h-full rounded-full border-hard" style={{ width: `${Math.max(4, (category.seconds / most) * 100)}%`, backgroundColor: category.color ?? "#b5b5b0" }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-muted">No focus sessions in the last 30 days.</p>
          )}
        </section>
      </div>

      <section aria-label="Recently completed" className="flex min-w-0 flex-col gap-3 rounded-card border-hard bg-white p-5.5 shadow-hard-5">
        <h2 className="text-lg font-semibold">Recently completed</h2>
        {recent.length ? (
          <ul className="flex flex-col divide-y divide-panel">
            {recent.map((row) => (
              <li key={row.id}>
                <Link href={`/tasks/${row.id}`} className="flex min-h-12 items-center gap-3 py-2">
                  <span aria-hidden="true" className="flex size-7 flex-none items-center justify-center rounded-lg border-hard bg-teal-tint">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-content text-sm font-semibold">{row.title}</span>
                    {row.category && <span className="truncate font-content text-xs text-muted">{row.category}</span>}
                  </span>
                  <span className="flex-none text-xs text-muted">{relativeTime(row.completedAt!, now, timeZone)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-muted">Finished tasks show up here.</p>
        )}
      </section>
    </>
  );
}

export default function HistoryPage() {
  return (
    <>
      <header>
        <h1 className="text-3xl font-bold tracking-[-0.6px]">Work history</h1>
        <p className="text-sm text-muted">Every task you finished, every day you showed up.</p>
      </header>
      <Suspense fallback={<div aria-hidden="true" className="h-60 animate-pulse rounded-card bg-panel motion-reduce:animate-none" />}>
        <Content />
      </Suspense>
    </>
  );
}
