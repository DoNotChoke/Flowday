// Milliseconds a zone is ahead of UTC at the given instant.
function zoneOffset(instant: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(instant);
  const part = (type: string) => Number(parts.find((candidate) => candidate.type === type)?.value);
  const wallClock = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
  return wallClock - Math.floor(instant / 1000) * 1000;
}

export function zonedToUtc(date: string, time: string | null, timeZone: string) {
  const wallClock = Date.parse(`${date}T${time ?? "00:00"}:00Z`);
  // The second pass corrects for a clock change between the guess and the real instant.
  const guess = wallClock - zoneOffset(wallClock, timeZone);
  return new Date(wallClock - zoneOffset(guess, timeZone));
}

export function utcToZoned(instant: Date, timeZone: string) {
  const [date, time] = new Date(instant.getTime() + zoneOffset(instant.getTime(), timeZone)).toISOString().split("T");
  return { date, time: time.slice(0, 5) };
}
