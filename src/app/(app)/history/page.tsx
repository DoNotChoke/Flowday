import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { requireUserId } from "@/lib/auth/session";
import { estimateLabel } from "@/lib/progress";
import { getHeatmap, getStreak, getSummary } from "@/services/stats";
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
const signed = (change: number) => `${change > 0 ? "+" : ""}${change}%`;

async function Content() {
  const userId = await requireUserId();
  const [streak, summary, heatmap] = await Promise.all([getStreak(userId), getSummary(userId, "month"), getHeatmap(userId)]);
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
