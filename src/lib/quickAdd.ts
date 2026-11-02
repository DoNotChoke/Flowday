import { parse } from "chrono-node/en";
import { utcToZoned } from "./datetime";

type Options = { categories: string[]; now: Date; timeZone: string };

const priorities = ["low", "medium", "high", "urgent"] as const;

function offsetMinutes(now: Date, timeZone: string) {
  const { date, time } = utcToZoned(now, timeZone);
  return Math.round((Date.parse(`${date}T${time}:00Z`) - now.getTime()) / 60_000);
}

function pad(value: number | null) {
  return String(value).padStart(2, "0");
}

export function parseQuickAdd(text: string, { categories, now, timeZone }: Options) {
  let rest = ` ${text} `;

  const found: string[] = [];
  // Longest first, because a category name can have spaces and contain another.
  for (const name of categories.toSorted((a, b) => b.length - a.length)) {
    const tag = ` #${name} `.toLowerCase();
    const at = rest.toLowerCase().indexOf(tag);
    if (at === -1) continue;
    found.push(name);
    rest = `${rest.slice(0, at)} ${rest.slice(at + tag.length)}`;
  }

  const unknownCategories = [...rest.matchAll(/\s#(\S+)/g)].map((match) => match[1]);
  rest = rest.replace(/\s#\S+/g, " ");

  let priority: (typeof priorities)[number] | null = null;
  rest = rest.replace(/\s!(low|medium|high|urgent)(?=\s)/i, (_, value: string) => {
    priority = priorities.find((option) => option === value.toLowerCase()) ?? null;
    return " ";
  });

  // A month alone ("Review May report") is more often a word than a date.
  const date = parse(rest, { instant: now, timezone: offsetMinutes(now, timeZone) }, { forwardDate: true }).find(
    ({ start }) => start.isCertain("day") || start.isCertain("weekday") || start.isCertain("hour"),
  );
  if (date) rest = `${rest.slice(0, date.index)} ${rest.slice(date.index + date.text.length)}`;

  return {
    title: rest.replace(/\s+/g, " ").trim(),
    dueDate: date ? `${date.start.get("year")}-${pad(date.start.get("month"))}-${pad(date.start.get("day"))}` : null,
    dueTime: date?.start.isCertain("hour") ? `${pad(date.start.get("hour"))}:${pad(date.start.get("minute"))}` : null,
    priority: priority as (typeof priorities)[number] | null,
    categories: categories.filter((name) => found.includes(name)),
    unknownCategories,
  };
}
