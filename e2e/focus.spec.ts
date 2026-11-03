import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { deleteUser, expectNoHorizontalScroll, signInNewUser } from "./helpers";

test.describe.configure({ timeout: 60_000 });

const start = new Date("2026-11-03T09:00:00+07:00");

function emailFor(testInfo: TestInfo) {
  return `e2e-focus-${testInfo.project.name}@flowday.test`;
}

const timer = (page: Page) => page.getByRole("region", { name: "Timer" });
const clock = (page: Page) => timer(page).getByText(/^\d\d:\d\d$/);
const tab = (page: Page, name: string) => page.getByRole("tab", { name });

test.beforeEach(async ({ page }, testInfo) => {
  // Stands in for the browser's notifications and records what was shown.
  await page.addInitScript(() => {
    const shown: string[] = [];
    Object.assign(window, { shownNotifications: shown });
    class FakeNotification {
      static permission = "granted";
      static requestPermission = async () => "granted";
      constructor(title: string) {
        shown.push(title);
      }
    }
    Object.assign(window, { Notification: FakeNotification });
  });
  await page.clock.install({ time: start });
  await signInNewUser(page, emailFor(testInfo));
  await page.goto("/focus");
  // Frozen so every read of the clock is exact; fastForward moves it on.
  await page.clock.pauseAt(new Date(start.getTime() + 10_000));
  await expect(clock(page)).toHaveText("25:00");
});

test.afterEach(async ({}, testInfo) => {
  await deleteUser(emailFor(testInfo));
});

test("a running timer keeps time while away and after a reload", async ({ page }) => {
  await timer(page).getByRole("button", { name: "Start" }).click();
  await page.clock.fastForward("05:00");
  await expect(clock(page)).toHaveText("20:00");
  await expect(page).toHaveTitle("20:00 · Focus — Flowday");

  await page.reload();
  await expect(clock(page)).toHaveText("20:00");
  await expect(timer(page).getByRole("button", { name: "Pause" })).toBeVisible();
  await page.clock.fastForward("01:00");
  await expect(clock(page)).toHaveText("19:00");
});

test("a paused timer stays where it stopped", async ({ page }) => {
  await timer(page).getByRole("button", { name: "Start" }).click();
  await page.clock.fastForward("03:00");
  await timer(page).getByRole("button", { name: "Pause" }).click();
  await page.clock.fastForward("10:00");
  await expect(clock(page)).toHaveText("22:00");

  await page.reload();
  await expect(clock(page)).toHaveText("22:00");
  await timer(page).getByRole("button", { name: "Resume" }).click();
  await page.clock.fastForward("02:00");
  await expect(clock(page)).toHaveText("20:00");
});

test("when time is up a notification shows and a short break is ready", async ({ page }) => {
  await timer(page).getByRole("button", { name: "Start" }).click();
  await page.clock.fastForward("25:00");

  await expect(tab(page, "Short break")).toHaveAttribute("aria-selected", "true");
  await expect(clock(page)).toHaveText("05:00");
  await expect(timer(page).getByRole("button", { name: "Start" })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { shownNotifications: string[] }).shownNotifications)).toEqual(["Focus session done"]);
});

test("+5 min, skip, reset, and no switching mode in the middle of a session", async ({ page }) => {
  await timer(page).getByRole("button", { name: "Start" }).click();
  await page.clock.fastForward("01:00");
  await expect(tab(page, "Long break")).toBeDisabled();

  await timer(page).getByRole("button", { name: "+5 min" }).click();
  await expect(clock(page)).toHaveText("29:00");

  await timer(page).getByRole("button", { name: "Reset timer" }).click();
  await expect(clock(page)).toHaveText("25:00");
  await expect(tab(page, "Long break")).toBeEnabled();

  await timer(page).getByRole("button", { name: "Skip to next" }).click();
  await expect(tab(page, "Short break")).toHaveAttribute("aria-selected", "true");
  await tab(page, "Long break").click();
  await expect(clock(page)).toHaveText("15:00");
});

test("the timer fits a small phone", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone layout");
  await page.setViewportSize({ width: 360, height: 780 });
  await expectNoHorizontalScroll(page);
  await expect(timer(page).getByRole("button", { name: "Start" })).toBeVisible();
});
