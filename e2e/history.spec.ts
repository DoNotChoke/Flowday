import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { expect, test, type TestInfo } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { addDays, utcToZoned, zonedToUtc } from "@/lib/datetime";
import { focusSession, task, user } from "@/lib/db/schema";
import { monthGrid } from "@/services/calendar";
import { createCategory } from "@/services/categories";
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

  // Today's outline, drawn outside the square, stays inside the box that scrolls and clips.
  const room = () =>
    todayCell.evaluate((cell) => {
      const box = cell.getBoundingClientRect();
      const clip = cell.closest("[class*=overflow-x-auto]")!.getBoundingClientRect();
      return Math.min(clip.right - box.right, clip.bottom - box.bottom, box.top - clip.top);
    });
  // Phones scroll to the latest weeks once the page has loaded.
  await expect.poll(room, { message: "the outline of today is cut off" }).toBeGreaterThanOrEqual(2);

  const details = year.locator("[aria-live]");
  if (isMobile) {
    await year.getByRole("button", { name: `${label(addDays(today, -1))}: 1 task, 0 focus sessions` }).tap();
    await expect(details).toHaveText(`${label(addDays(today, -1))}: 1 task, 0 focus sessions`);
  } else {
    // The whole year fits a wide screen, weekday labels included.
    await expect(year.getByText("Mon", { exact: true })).toBeInViewport();
    const overflow = await year.getByRole("group").evaluate((grid) => grid.parentElement!.scrollWidth - grid.parentElement!.clientWidth);
    expect(overflow, "the heatmap scrolls on a wide screen").toBeLessThanOrEqual(0);

    // Left is a week back in a grid of weeks.
    await todayCell.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(details).toHaveText(`${label(addDays(today, -7))}: 0 tasks, 0 focus sessions`);

    // Leaving the grid leaves no day picked.
    await todayCell.blur();
    await todayCell.hover();
    await expect(year.getByRole("button", { pressed: true })).toHaveCount(1);
    await page.getByRole("heading", { name: "Work history" }).hover();
    await expect(year.getByRole("button", { pressed: true })).toHaveCount(0);
    await expect(details).toHaveText(`${label(today)}: 2 tasks, 0 focus sessions`);
  }
  await expectNoHorizontalScroll(page);
});

test("recently completed and time by category come from the tasks and focus sessions", async ({ page }, testInfo) => {
  const [owner] = await db.select({ id: user.id }).from(user).where(eq(user.email, emailFor(testInfo)));
  const writing = await createCategory(owner.id, "Viết lách");
  const { id } = await createTask(owner.id, { title: "Chương ba", status: "completed", categoryIds: [writing.id] });
  await db.insert(focusSession).values({ id: randomUUID(), userId: owner.id, taskId: id, mode: "focus", startedAt: new Date(Date.now() - 2 * 3_600_000), endedAt: new Date(Date.now() - 1_800_000), seconds: 5400, completed: true });
  await page.goto("/history");

  const recent = page.getByRole("region", { name: "Recently completed" });
  await expect(recent.getByRole("link", { name: /Chương ba\s*Viết lách\s*Just now/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Time by category" })).toContainText(/Viết lách\s*1\.5h/);
  await expect(page.getByRole("region", { name: "Daily tasks overview" }).getByRole("img")).toHaveAccessibleName("Over the last 30 days: 1 task created, 1 completed.");
});

test("the range changes the numbers and stays after a reload", async ({ page }, testInfo) => {
  await finishOn(testInfo, [0]);
  await page.goto("/history");
  const ranges = page.getByRole("group", { name: "Range" });
  await expect(ranges.getByRole("link", { name: "Month" })).toHaveAttribute("aria-current", "true");

  await ranges.getByRole("link", { name: "Week" }).click();
  await expect(page).toHaveURL(/range=week/);
  await expect(page.getByRole("region", { name: "Completion rate" })).toContainText("Of tasks created in the last 7 days");
  await page.reload();
  await expect(page.getByRole("region", { name: "Daily tasks overview" }).getByRole("img")).toHaveAccessibleName(/^Over the last 7 days/);
});

test("the CSV holds the finished tasks and opens right in Excel", async ({ page }, testInfo) => {
  const [owner] = await db.select({ id: user.id }).from(user).where(eq(user.email, emailFor(testInfo)));
  await createTask(owner.id, { title: "=Đọc, rồi viết", status: "completed", estimateMin: 45 });
  await page.goto("/history?range=week");

  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export CSV" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("flowday-history-week.csv");
  const text = readFileSync((await file.path())!, "utf8");
  expect(text.startsWith("﻿Completed,Code,Title,Project,Categories,Estimate (min),Focus (min)\r\n")).toBe(true);
  expect(text).toContain(`,"'=Đọc, rồi viết",,,45,0\r\n`);
});

test("the CSV needs a signed-in user", async ({ page }) => {
  await page.context().clearCookies();
  const response = await page.request.get("/history/export", { maxRedirects: 0 });
  expect(response.status()).toBeGreaterThanOrEqual(300);
  expect(await response.text()).not.toContain("Completed,Code");
});

test("achievements show which badges are earned", async ({ page }, testInfo) => {
  await finishOn(testInfo, [0]);
  await page.goto("/history");
  const badges = page.getByRole("region", { name: "Achievements" }).getByRole("listitem");
  await expect(badges).toHaveCount(6);
  await expect(badges.filter({ hasText: "Inbox zero" })).toContainText("Earned");
  await expect(badges.filter({ hasText: "7-day streak" })).toContainText("Not earned yet");
});
