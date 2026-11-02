import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { completeTask, deleteUser, expectNoHorizontalScroll, signInNewUser } from "./helpers";

function emailFor(testInfo: TestInfo) {
  return `e2e-overview-${testInfo.project.name}@flowday.test`;
}

const summary = (page: Page) => page.getByRole("region", { name: "Project summary" });

test.beforeEach(async ({ page }, testInfo) => {
  await signInNewUser(page, emailFor(testInfo));
  await page.goto("/projects/new");
  await expect(page.getByRole("button", { name: "Create project" })).toBeEnabled();
  await page.getByLabel("Project name").fill("Đồ án tốt nghiệp");
  await page.getByLabel("Goal & description").fill("Bảo vệ trước tháng Một");
  await page.getByLabel("Target end date").fill("2030-01-15");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("heading", { name: "Đồ án tốt nghiệp" })).toBeVisible();
});

test.afterEach(async ({}, testInfo) => {
  await deleteUser(emailFor(testInfo));
});

test("the overview shows the project and its real numbers", async ({ page }, testInfo) => {
  await expect(page.getByText("DAT · Software sprint").filter({ visible: true })).toBeVisible();
  await expect(page.getByText("Bảo vệ trước tháng Một")).toBeVisible();
  await expect(summary(page)).toContainText("0%");
  await expect(summary(page)).toContainText("0 / 4");
  await expect(summary(page)).toContainText("4 open · 0 overdue");
  await expect(summary(page)).toContainText("Jan 15, 2030");
  await expect(summary(page)).toContainText(/\d+ days left/);

  await completeTask(emailFor(testInfo), "Build auth flow");
  await page.reload();
  await expect(summary(page)).toContainText("25%");
  await expect(summary(page)).toContainText("1 / 4");
});

test("Add task starts with this project chosen, and the new task counts", async ({ page }) => {
  await page.getByRole("link", { name: "Add task" }).click();
  await expect(page.getByRole("button", { name: "Create Task" })).toBeEnabled();
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(/.+/);

  await page.getByLabel("Task name").fill("Quá hạn rồi");
  await page.getByLabel("Due date").fill("2026-01-01");
  await page.getByRole("button", { name: "Create Task" }).click();
  await expect(page).toHaveURL("/tasks");

  await page.goBack();
  await page.goBack();
  await page.reload();
  await expect(summary(page)).toContainText("0 / 5");
  await expect(summary(page)).toContainText("5 open · 1 overdue");
});

for (const width of [360, 390, 820, 1440]) {
  test(`no horizontal scroll at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });

    await expect(summary(page)).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
}
