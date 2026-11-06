import { Flame } from "@/components/app/Flame";
import { addDays } from "@/lib/datetime";

const weekdays = ["M", "T", "W", "T", "F", "S", "S"];
const shortDate = (day: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(Date.parse(day));

type StreakCardProps = { current: number; doneToday: boolean; lostOn: string | null; today: string; days: string[] };

export function StreakCard({ current, doneToday, lostOn, today, days }: StreakCardProps) {
  const live = current > 0;
  const active = new Set(days);
  const monday = addDays(today, -((new Date(today).getUTCDay() + 6) % 7));
  const message = live
    ? doneToday
      ? "You’re on fire! Come back tomorrow to keep it going."
      : `Finish 1 task today to reach ${current + 1}.`
    : lostOn
      ? `Streak lost on ${shortDate(lostOn)} — complete a task today to light it again.`
      : "Finish a task or a focus session to start a streak.";

  return (
    <section aria-label="Current streak" className={`col-span-full flex min-w-0 flex-wrap items-center gap-5.5 rounded-card border-hard p-5.5 shadow-hard-5 md:col-span-2 ${live ? "bg-coral" : "bg-panel"}`}>
      <div className="flex size-20 flex-none items-center justify-center rounded-3xl border-hard bg-white md:size-26 md:rounded-[28px]">
        <Flame size={70} lit={live} flicker={live} label={live ? "Streak is burning" : "Streak is out"} />
      </div>
      <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1.5">
        <span className="text-[13px] font-semibold tracking-[0.5px]">CURRENT STREAK</span>
        <span className="text-[44px] leading-none font-bold tracking-[-1px]">
          {current} {current === 1 ? "day" : "days"}
        </span>
        <span className="text-[13px] text-[#3a2420]">{message}</span>
        <ol aria-label="This week" className="mt-2 grid max-w-64 grid-cols-7 gap-1.5 md:gap-2">
          {weekdays.map((letter, index) => {
            const day = addDays(monday, index);
            const lit = active.has(day);
            return (
              <li key={day} className="flex min-w-0 flex-col items-center gap-1 text-[11px]">
                <span className={`flex aspect-square w-full max-w-7.5 items-center justify-center rounded-[10px] border-hard ${lit ? "bg-sun-tint" : "bg-white"}`}>
                  <Flame size={14} lit={lit} />
                </span>
                <span aria-hidden="true">{letter}</span>
                <span className="sr-only">
                  {new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(Date.parse(day))}: {lit ? "active" : day > today ? "still to come" : "no activity"}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
