import { expect, test, type TestInfo } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { createTask } from "@/services/tasks";
import { deleteUser, expectNoHorizontalScroll, signInNewUser } from "./helpers";

test.describe.configure({ timeout: 60_000 });

function emailFor(testInfo: TestInfo) {
  return `e2e-calendar-${testInfo.project.name}@flowday.test`;
}

async function addTasks(testInfo: TestInfo, tasks: { title: string; dueDate: string; dueTime?: string }[]) {
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
