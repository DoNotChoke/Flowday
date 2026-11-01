import { randomInt } from "node:crypto";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { deleteUser, expectNoHorizontalScroll, verifyEmail } from "./helpers";

function emailFor(testInfo: TestInfo) {
  return `e2e-projects-${testInfo.project.name}@flowday.test`;
}

async function signUp(page: Page, testInfo: TestInfo) {
  const email = emailFor(testInfo);
  const password = "correct-horse-battery";
  const headers = { "x-forwarded-for": `10.${randomInt(256)}.${randomInt(256)}.${randomInt(256)}` };
  await page.request.post("/api/auth/sign-up/email", { data: { name: "Việt", email, password }, headers });
  await verifyEmail(email);
  await page.request.post("/api/auth/sign-in/email", { data: { email, password }, headers });
}

test.beforeEach(async ({ page }, testInfo) => {
  await signUp(page, testInfo);
  await page.goto("/projects/new");
  await expect(page.getByRole("button", { name: "Create project" })).toBeEnabled();
});

test.afterEach(async ({}, testInfo) => {
  await deleteUser(emailFor(testInfo));
});

test("the preview follows the form", async ({ page }) => {
  await page.getByLabel("Project name").fill("Đồ án tốt nghiệp");

  await expect(page.getByLabel("Task prefix")).toHaveValue("DAT");
  await expect(page.getByText("DAT · Software sprint")).toBeVisible();

  await page.getByRole("button", { name: /Personal goal/ }).click();
  await expect(page.getByText("Celebrate milestone")).toBeVisible();
  await expect(page.getByText("Write release notes")).toHaveCount(0);
});

test("creating a project opens it", async ({ page }) => {
  await page.getByLabel("Project name").fill("Đồ án tốt nghiệp");
  await page.getByRole("button", { name: "Create project" }).click();

  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Đồ án tốt nghiệp" })).toBeVisible();
});

test("an end date before the start date shows on that field", async ({ page }) => {
  await page.getByLabel("Project name").fill("Backwards");
  await page.getByLabel("Start date").fill("2026-12-01");
  await page.getByLabel("Target end date").fill("2026-11-01");
  await page.getByRole("button", { name: "Create project" }).click();

  await expect(page.getByLabel("Target end date")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Project name")).toHaveValue("Backwards");
});

test("someone else's project address is a 404", async ({ page }) => {
  await page.goto("/projects/does-not-exist");

  await expect(page.getByText("This page could not be found")).toBeVisible();
});

for (const width of [360, 390, 820, 1440]) {
  test(`no horizontal scroll at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });

    await expect(page.getByRole("heading", { name: "Create a new project" })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
}
