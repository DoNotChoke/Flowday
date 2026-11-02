import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { archiveProjects, createProjects, deleteUser, expectNoHorizontalScroll, signInNewUser } from "./helpers";

test.describe.configure({ timeout: 60_000 });

function emailFor(testInfo: TestInfo) {
  return `e2e-settings-${testInfo.project.name}@flowday.test`;
}

const block = (page: Page, name: string) => page.getByRole("region", { name });

test.beforeEach(async ({ page }, testInfo) => {
  await signInNewUser(page, emailFor(testInfo));
  await page.goto("/settings");
  await expect(page.getByRole("button", { name: "Save profile" })).toBeEnabled();
});

test.afterEach(async ({}, testInfo) => {
  await deleteUser(emailFor(testInfo));
});

test("a new name shows at once in the greeting and the account", async ({ page, isMobile }) => {
  await expect(page.getByText("Việt", { exact: true }).first()).toBeAttached();
  await page.getByLabel("Name", { exact: true }).fill("Nguyễn Mới");
  await page.getByRole("button", { name: "Save profile" }).click();

  await expect(page.getByRole("button", { name: "Save profile" })).toBeEnabled();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Nguyễn Mới");
  if (isMobile) await page.getByRole("button", { name: "Account" }).click();
  await expect(page.getByText("Nguyễn Mới", { exact: true }).filter({ visible: true })).toBeVisible();

  await page.goto("/tasks");
  await expect(page.getByRole("heading", { name: "Hi, Nguyễn Mới" })).toBeVisible();
});

test("the time zone is kept, and a blank name is refused", async ({ page }) => {
  await page.getByLabel("Time zone").selectOption("Asia/Tokyo");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByLabel("Time zone")).toHaveValue("Asia/Tokyo");
  await expect(page.getByRole("button", { name: "Save profile" })).toBeEnabled();

  await page.reload();
  await expect(page.getByLabel("Time zone")).toHaveValue("Asia/Tokyo");

  await page.getByLabel("Name", { exact: true }).fill("   ");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(block(page, "Profile").getByRole("alert")).toContainText("Enter your name.");
});

test("a category is renamed, a taken name is refused, and deleting removes it", async ({ page }) => {
  const research = page.getByRole("textbox", { name: "Rename Research" });
  await research.fill("Nghiên cứu");
  await research.press("Enter");
  await expect(page.getByRole("textbox", { name: "Rename Nghiên cứu" })).toBeVisible();

  const coding = page.getByRole("textbox", { name: "Rename Coding" });
  await coding.fill("design");
  await coding.press("Enter");
  await expect(block(page, "Categories").getByRole("alert")).toContainText("You already have this category.");
  await expect(coding).toHaveValue("Coding");

  await page.getByRole("button", { name: "Delete Coding" }).click();
  await expect(page.getByRole("textbox", { name: "Rename Coding" })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("textbox", { name: "Rename Nghiên cứu" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Rename Coding" })).toHaveCount(0);
});

test("an archived project is listed and can be restored", async ({ page }, testInfo) => {
  await expect(block(page, "Archived projects").getByText("No archived projects")).toBeVisible();
  await createProjects(emailFor(testInfo), ["Đồ án cũ"]);
  await archiveProjects(emailFor(testInfo));
  await page.reload();

  await block(page, "Archived projects").getByRole("button", { name: "Restore project" }).click();
  await expect(block(page, "Archived projects").getByText("No archived projects")).toBeVisible();
});

for (const width of [360, 390, 820, 1440]) {
  test(`no horizontal scroll at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });

    await expect(block(page, "Profile")).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
}
