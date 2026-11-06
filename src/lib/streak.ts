import { addDays } from "./datetime";

// Streaks from the days with any activity, written YYYY-MM-DD in the owner's zone.
// A day without activity yet still keeps yesterday's streak alive; it is lost only once a whole day passes empty.
export function streaks(days: Iterable<string>, today: string) {
  const active = new Set(days);
  const yesterday = addDays(today, -1);
  const end = active.has(today) ? today : active.has(yesterday) ? yesterday : null;

  let current = 0;
  for (let day = end; day && active.has(day); day = addDays(day, -1)) current++;

  let longest = 0;
  let run = 0;
  let previous = "";
  for (const day of [...active].sort()) {
    run = previous && addDays(previous, 1) === day ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }

  return {
    current,
    longest,
    doneToday: active.has(today),
    // The first empty day after the last streak, shown as "Streak lost on …".
    lostOn: current === 0 && previous ? addDays(previous, 1) : null,
  };
}
