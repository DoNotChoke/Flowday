import { expect, test, type TestInfo } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { addDays, utcToZoned, zonedToUtc } from "@/lib/datetime";
import { task, user } from "@/lib/db/schema";
import { monthGrid } from "@/services/calendar";
import { createTask } from "@/services/tasks";
import { deleteUser, expectNoHorizontalScroll, signInNewUser } from "./helpers";

test.describe.configure({ timeout: 60_000 });

const zone = "Asia/Ho_Chi_Minh";

function emailFor(testInfo: TestInfo) {
  return `e2e-history-${testInfo.project.name}@flowday.test`;
}

// Finishes one task at noon on each day, counted back from today.
async function finishOn(testInfo: TestInfo, daysAgo: number[]) {
  const [owner] = await db.select({ id: user.id }).from(user).where(eq(user.email, emailFor(testInfo)));
  const today = utcToZoned(new Date(), zone).date;
  for (const ago of daysAgo) {
    const { id } = await createTask(owner.id, { title: `Done ${ago} days ago`, status: "completed" });
    await db.update(task).set({ completedAt: zonedToUtc(addDays(today, -ago), "12:00", zone) }).where(eq(task.id, id));
  }
  return today;
}

test.beforeEach(async ({ page }, testInfo) => {
  await signInNewUser(page, emailFor(testInfo));
});

test.afterEach(async ({}, testInfo) => {
  await deleteUser(emailFor(testInfo));
});

test("three days in a row show the same streak on history, the sidebar and the calendar", async ({ page, isMobile }, testInfo) => {
  const today = await finishOn(testInfo, [0, 1, 2, 5]);
  await page.goto("/history");

  const card = page.getByRole("region", { name: "Current streak" });
  await expect(card).toContainText("3 days");
  await expect(card.getByRole("img", { name: "Streak is burning" })).toBeVisible();
  await expect(card).toContainText("Come back tomorrow");
  if (!isMobile) await expect(page.getByRole("link", { name: /3 days\s*Current streak/ })).toBeVisible();

  await page.goto(`/calendar?date=${today}`);
  const streakDays = page.getByRole("region", { name: "Month" }).getByRole("link", { name: /streak day$/ });
  const shown = monthGrid(today).filter((day) => [0, 1, 2, 5].some((ago) => addDays(today, -ago) === day));
  await expect(streakDays).toHaveCount(shown.length);
});

test("nothing done today keeps yesterday's streak and asks for one more", async ({ page }, testInfo) => {
  await finishOn(testInfo, [1, 2]);
  await page.goto("/history");
  await expect(page.getByRole("region", { name: "Current streak" })).toContainText("Finish 1 task today to reach 3.");
});

test("a lost streak says when, and a new account starts empty", async ({ page }, testInfo) => {
  await page.goto("/history");
  const card = page.getByRole("region", { name: "Current streak" });
  await expect(card).toContainText("0 days");
  await expect(card).toContainText("Finish a task or a focus session to start a streak.");
  await expect(page.getByRole("region", { name: "Completion rate" })).toContainText("—");

  await finishOn(testInfo, [3]);
  await page.reload();
  await expect(card.getByRole("img", { name: "Streak is out" })).toBeVisible();
  await expect(card).toContainText("Streak lost on");
});

test("completion rate and focus hours come from the last 30 days", async ({ page }, testInfo) => {
  await finishOn(testInfo, [0]);
  const [owner] = await db.select({ id: user.id }).from(user).where(eq(user.email, emailFor(testInfo)));
  await createTask(owner.id, { title: "Still open" });
  await page.goto("/history");
  await expect(page.getByRole("region", { name: "Completion rate" })).toContainText("50%");
  await expect(page.getByRole("region", { name: "Focus hours" })).toContainText("0h");
});

test("history fits a small phone", async ({ page, isMobile }, testInfo) => {
  test.skip(!isMobile, "phone layout");
  await finishOn(testInfo, [0, 1]);
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/history");
  await expect(page.getByRole("region", { name: "Current streak" })).toContainText("2 days");
  await expectNoHorizontalScroll(page);
});

test("the heatmap shows a day's count, by mouse, keyboard or touch", async ({ page, isMobile }, testInfo) => {
  const today = await finishOn(testInfo, [0, 0, 1]);
  await page.goto("/history");
  const year = page.getByRole("region", { name: "Activity over the last year" });
  await expect(year.getByRole("heading")).toHaveText("3 tasks completed in the last year");

  const label = (day: string) => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(Date.parse(day));
  const todayCell = year.getByRole("button", { name: `${label(today)}: 2 tasks, 0 focus sessions` });
  await expect(todayCell).toBeAttached();
  await expect(year).toContainText(`${label(today)}: 2 tasks, 0 focus sessions`);

  const details = year.locator("[aria-live]");
  if (isMobile) {
    await year.getByRole("button", { name: `${label(addDays(today, -1))}: 1 task, 0 focus sessions` }).tap();
    await expect(details).toHaveText(`${label(addDays(today, -1))}: 1 task, 0 focus sessions`);
  } else {
    // Left is a week back in a grid of weeks.
    await todayCell.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(details).toHaveText(`${label(addDays(today, -7))}: 0 tasks, 0 focus sessions`);
  }
  await expectNoHorizontalScroll(page);
});
