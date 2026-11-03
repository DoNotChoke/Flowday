import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { createTask } from "@/services/tasks";
import { deleteUser, expectNoHorizontalScroll, signInNewUser } from "./helpers";

test.describe.configure({ timeout: 60_000 });

function emailFor(testInfo: TestInfo) {
  return `e2e-calendar-${testInfo.project.name}@flowday.test`;
}

async function addTasks(testInfo: TestInfo, tasks: { title: string; dueDate?: string; dueTime?: string }[]) {
  const [owner] = await db.select({ id: user.id }).from(user).where(eq(user.email, emailFor(testInfo)));
  for (const input of tasks) await createTask(owner.id, input);
}

test.beforeEach(async ({ page }, testInfo) => {
  await signInNewUser(page, emailFor(testInfo));
});

test.afterEach(async ({}, testInfo) => {
  await deleteUser(emailFor(testInfo));
});

test("a task shows on its day, and the agenda opens it", async ({ page }, testInfo) => {
  await addTasks(testInfo, [{ title: "Sprint demo", dueDate: "2026-11-20", dueTime: "10:00" }]);
  await page.goto("/calendar?date=2026-11-01");
  await expect(page.getByRole("heading", { name: "November 2026" })).toBeVisible();

  await page.getByRole("link", { name: "November 20, 1 task" }).click();
  await expect(page).toHaveURL(/date=2026-11-20/);
  const agenda = page.getByRole("region", { name: "Agenda" });
  await expect(agenda.getByRole("heading", { name: "November 20" })).toBeVisible();
  await expect(agenda.getByText("10:00")).toBeVisible();

  await agenda.getByRole("link", { name: /Sprint demo/ }).click();
  await expect(page.getByRole("heading", { name: "Sprint demo" })).toBeVisible();
});

test("the week starts on Monday and months change from the header", async ({ page }) => {
  await page.goto("/calendar?date=2026-11-10");
  const days = page.getByRole("region", { name: "Month" }).getByRole("link");
  await expect(days.first()).toHaveAccessibleName(/^October 26,/);
  await expect(days).toHaveCount(42);

  await page.getByRole("link", { name: "Next month" }).click();
  await expect(page.getByRole("heading", { name: "December 2026" })).toBeVisible();
  await page.getByRole("link", { name: "Previous month" }).click();
  await expect(page.getByRole("heading", { name: "November 2026" })).toBeVisible();
  await page.getByRole("link", { name: "Previous month" }).click();
  await expect(page.getByRole("heading", { name: "October 2026" })).toBeVisible();

  await page.getByRole("link", { name: "Today", exact: true }).click();
  const thisMonth = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
  await expect(page.getByRole("heading", { name: thisMonth })).toBeVisible();
  await expect(page.getByRole("region", { name: "Month" }).getByRole("link", { name: /today/ })).toHaveAttribute("aria-current", "date");
});

test("a busy day shows two tasks and how many more", async ({ page, isMobile }, testInfo) => {
  test.skip(isMobile, "phones show dots instead of titles");
  await addTasks(testInfo, ["One", "Two", "Three"].map((title) => ({ title, dueDate: "2026-11-11" })));
  await page.goto("/calendar?date=2026-11-01");

  const day = page.getByRole("link", { name: "November 11, 3 tasks" });
  await expect(day.getByText("+1 more")).toBeVisible();
  await expect(day.getByText("Three")).toHaveCount(0);
});

test("the add button starts a task due on the chosen day", async ({ page }) => {
  await page.goto("/calendar?date=2026-11-20");
  await page.getByRole("link", { name: "Add task on November 20" }).click();
  await expect(page.getByLabel("Due date")).toHaveValue("2026-11-20");
});

test("a phone shows the month without scrolling sideways", async ({ page, isMobile }, testInfo) => {
  test.skip(!isMobile, "phone layout");
  await addTasks(testInfo, [{ title: "Gym", dueDate: "2026-11-05" }]);
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/calendar?date=2026-11-01");

  await expect(page.getByRole("heading", { name: "November 2026" })).toBeVisible();
  await expectNoHorizontalScroll(page);
  const cell = page.getByRole("link", { name: "November 5, 1 task" });
  const box = (await cell.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.width).toBeGreaterThanOrEqual(42);

  await cell.tap();
  await expect(page.getByRole("region", { name: "Agenda" }).getByText("Gym")).toBeVisible();
});

const saved = (page: Page) => page.waitForResponse((response) => response.request().method() === "POST");

test("an unscheduled task is planned from the sheet and shows in the agenda", async ({ page }, testInfo) => {
  await addTasks(testInfo, [{ title: "Read DDIA" }]);
  await page.goto("/calendar?date=2026-11-01");
  const unscheduled = page.getByRole("region", { name: "Unscheduled" });
  await expect(unscheduled.getByRole("heading", { name: "Unscheduled · 1" })).toBeVisible();

  await unscheduled.getByRole("button", { name: "Plan Read DDIA" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Day").fill("2026-11-12");
  const response = saved(page);
  await sheet.getByRole("button", { name: "Plan" }).click();
  await response;
  await expect(unscheduled.getByRole("heading", { name: "Unscheduled · 0" })).toBeVisible();

  await page.goto("/calendar?date=2026-11-12");
  const agenda = page.getByRole("region", { name: "Agenda" });
  await expect(agenda.getByRole("link", { name: /Read DDIA/ })).toContainText("Planned");
  await expect(page.getByRole("region", { name: "Unscheduled" }).getByRole("heading", { name: "Unscheduled · 0" })).toBeVisible();

  await agenda.getByRole("link", { name: /Read DDIA/ }).click();
  await page.getByRole("button", { name: /Planned Thu, Nov 12/ }).click();
  const removed = saved(page);
  await page.getByRole("dialog").getByRole("button", { name: "Remove from calendar" }).click();
  await removed;
  await expect(page.getByRole("button", { name: /Planned Not planned/ })).toBeVisible();

  await page.goto("/calendar?date=2026-11-12");
  await expect(page.getByRole("region", { name: "Unscheduled" }).getByRole("heading", { name: "Unscheduled · 1" })).toBeVisible();
});

test("dragging a task onto a day plans it", async ({ page, isMobile }, testInfo) => {
  test.skip(isMobile, "phones plan from the sheet");
  await addTasks(testInfo, [{ title: "Renew domain" }]);
  await page.goto("/calendar?date=2026-11-01");

  const from = (await page.getByRole("button", { name: "Drag Renew domain" }).boundingBox())!;
  const to = (await page.getByRole("link", { name: "November 12, 0 tasks" }).boundingBox())!;
  const response = saved(page);
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 - 12, from.y + from.height / 2, { steps: 4 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.move(to.x + to.width / 2 + 1, to.y + to.height / 2 + 1);
  await page.mouse.up();
  await response;

  await page.reload();
  await expect(page.getByRole("link", { name: "November 12, 1 task" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Unscheduled · 0" })).toBeVisible();
});

test("a task can be planned with the keyboard alone", async ({ page, isMobile }, testInfo) => {
  test.skip(isMobile, "phones plan from the sheet");
  await addTasks(testInfo, [{ title: "Renew domain" }]);
  await page.goto("/calendar?date=2026-11-01");

  await page.getByRole("button", { name: "Drag Renew domain" }).focus();
  await page.keyboard.press("Space");
  // dnd-kit attaches its key listener on the next tick.
  await page.waitForTimeout(100);
  await page.keyboard.press("ArrowLeft");
  const response = saved(page);
  await page.keyboard.press("Space");
  await response;

  await page.reload();
  await expect(page.getByRole("heading", { name: "Unscheduled · 0" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Month" }).getByRole("link", { name: /, 1 task$/ })).toHaveCount(1);
});

test("a plan that cannot be saved puts the task back in Unscheduled", async ({ page }, testInfo) => {
  await addTasks(testInfo, [{ title: "Renew domain" }]);
  await page.goto("/calendar?date=2026-11-01");
  await page.route("/calendar?date=2026-11-01", (route) => (route.request().method() === "POST" ? route.abort() : route.continue()));

  await page.getByRole("button", { name: "Plan Renew domain" }).click();
  await page.getByRole("dialog").getByLabel("Day").fill("2026-11-12");
  await page.getByRole("dialog").getByRole("button", { name: "Plan" }).click();

  await expect(page.getByRole("alert").filter({ hasText: "Could not plan Renew domain" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Unscheduled · 1" })).toBeVisible();
});
