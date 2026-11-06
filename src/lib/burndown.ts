import { addDays } from "./datetime";

export type BurndownTask = { estimateMin: number | null; created: string; completed: string | null };

// Estimated hours still to do at the end of each day from `from` to `to`, days written YYYY-MM-DD.
// A task counts from the day it was added until the day it was finished; days after today have no value yet.
// shortcut: an estimate changed later counts from the start, add estimate snapshots if the line must be exact.
export function burndown(tasks: BurndownTask[], from: string, to: string, today: string) {
  const points: { day: string; remaining: number | null }[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const minutes = tasks
      .filter((task) => task.estimateMin && task.created <= day && !(task.completed && task.completed <= day))
      .reduce((sum, task) => sum + task.estimateMin!, 0);
    points.push({ day, remaining: day <= today ? minutes / 60 : null });
  }
  return points;
}
