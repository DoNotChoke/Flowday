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

// React reveals streamed content on a timer, which a frozen clock never fires. The clock rounds up, so half a second shows no change.
async function reload(page: Page) {
  await page.reload();
  await page.clock.runFor(500);
}

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
  // A second after now, however long sign-in took on a busy machine.
  await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 1_000));
  await page.clock.runFor(500);
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

  await reload(page);
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

  await reload(page);
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

async function setFocusLength(page: Page, preset: string) {
  await page.getByRole("region", { name: "Timer lengths" }).getByRole("button", { name: "Edit" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("button", { name: preset }).click();
  const saved = page.waitForResponse((response) => response.request().method() === "POST");
  await sheet.getByRole("button", { name: "Save" }).click();
  await saved;
  await expect(sheet).toBeHidden();
}

test("a new focus length is used from the next session and kept after a reload", async ({ page }) => {
  await setFocusLength(page, "50 min");
  await expect(clock(page)).toHaveText("50:00");
  await expect(page.getByRole("region", { name: "Timer lengths" })).toContainText("Focus 50 · Short 5 · Long 15 min");

  await reload(page);
  await expect(clock(page)).toHaveText("50:00");
});

test("changing the length leaves a running session alone", async ({ page }) => {
  await timer(page).getByRole("button", { name: "Start" }).click();
  await page.clock.fastForward("01:00");
  await setFocusLength(page, "90 min");
  await expect(clock(page)).toHaveText("24:00");

  await timer(page).getByRole("button", { name: "Reset timer" }).click();
  await expect(clock(page)).toHaveText("90:00");
});

test("a started session shows on other pages and rings there when time is up", async ({ page }) => {
  await timer(page).getByRole("button", { name: "Start" }).click();
  await page.clock.fastForward("01:00");
  await page.goto("/tasks");
  await page.clock.runFor(500);

  const pill = page.getByRole("link", { name: /^Focus, \d\d:\d\d left/ }).filter({ visible: true });
  await expect(pill).toHaveAccessibleName("Focus, 24:00 left. Open Focus mode");
  await page.clock.fastForward("04:00");
  await expect(pill).toHaveAccessibleName("Focus, 20:00 left. Open Focus mode");

  await page.clock.fastForward("20:00");
  await expect(pill).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { shownNotifications: string[] }).shownNotifications)).toEqual(["Focus session done"]);

  await page.goto("/focus");
  await page.clock.runFor(500);
  await expect(tab(page, "Short break")).toHaveAttribute("aria-selected", "true");
});

test("the pill leads back to the timer, and says when it is paused", async ({ page }) => {
  await timer(page).getByRole("button", { name: "Start" }).click();
  await page.clock.fastForward("02:00");
  await timer(page).getByRole("button", { name: "Pause" }).click();
  await page.goto("/calendar");
  await page.clock.runFor(500);

  const pill = page.getByRole("link", { name: "Focus · Paused, 23:00 left. Open Focus mode" }).filter({ visible: true });
  await pill.click();
  await expect(page).toHaveURL(/\/focus$/);
  await expect(page.getByRole("link", { name: /Open Focus mode/ }).filter({ visible: true })).toHaveCount(0);
});
