import { expect, test } from "vitest";
import { zonedToUtc, utcToZoned } from "@/lib/datetime";

const cases = [
  { zone: "Asia/Ho_Chi_Minh", date: "2026-11-06", time: "17:00", utc: "2026-11-06T10:00:00.000Z" },
  { zone: "Asia/Ho_Chi_Minh", date: "2026-11-06", time: "00:30", utc: "2026-11-05T17:30:00.000Z" },
  { zone: "Asia/Ho_Chi_Minh", date: "2026-11-06", time: "23:59", utc: "2026-11-06T16:59:00.000Z" },
  { zone: "America/New_York", date: "2026-07-01", time: "20:00", utc: "2026-07-02T00:00:00.000Z" },
  { zone: "America/New_York", date: "2026-12-31", time: "22:00", utc: "2027-01-01T03:00:00.000Z" },
  { zone: "Asia/Kolkata", date: "2026-03-01", time: "05:30", utc: "2026-03-01T00:00:00.000Z" },
  { zone: "Pacific/Auckland", date: "2026-01-01", time: "09:00", utc: "2025-12-31T20:00:00.000Z" },
];

for (const { zone, date, time, utc } of cases) {
  test(`${date} ${time} in ${zone} is ${utc}`, () => {
    expect(zonedToUtc(date, time, zone).toISOString()).toBe(utc);
  });

  test(`${utc} reads back as ${date} ${time} in ${zone}`, () => {
    expect(utcToZoned(new Date(utc), zone)).toEqual({ date, time });
  });
}

test("a date with no time means the start of that day", () => {
  expect(zonedToUtc("2026-11-06", null, "Asia/Ho_Chi_Minh").toISOString()).toBe("2026-11-05T17:00:00.000Z");
});

test("a clock change does not shift the time on the other side of it", () => {
  // New York leaves daylight time on 2026-11-01.
  expect(zonedToUtc("2026-11-02", "09:00", "America/New_York").toISOString()).toBe("2026-11-02T14:00:00.000Z");
  expect(zonedToUtc("2026-10-31", "09:00", "America/New_York").toISOString()).toBe("2026-10-31T13:00:00.000Z");
});
