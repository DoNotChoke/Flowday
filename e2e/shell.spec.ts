import { randomInt } from "node:crypto";
import { expect, test, type TestInfo } from "@playwright/test";
import { deleteUser, expectNoHorizontalScroll } from "./helpers";

const sections = [
  { name: "My tasks", path: "/tasks" },
  { name: "Calendar", path: "/calendar" },
  { name: "History", path: "/history" },
  { name: "Focus mode", path: "/focus" },
  { name: "Settings", path: "/settings" },
];

function emailFor(testInfo: TestInfo) {
  return `e2e-shell-${testInfo.project.name}@flowday.test`;
}

for (const path of [...sections.map((section) => section.path), "/tasks/new"]) {
  test(`${path} sends a signed-out visitor to sign-in`, async ({ page }) => {
    await page.goto(path);

    await expect(page).toHaveURL(/\/sign-in\?next=/);
  });
}

test.describe("signed in on a wide screen", () => {
  test.skip(({ isMobile }) => isMobile, "the sidebar starts at 1024 px");

  test.beforeEach(async ({ page }, testInfo) => {
    const ip = `10.${randomInt(256)}.${randomInt(256)}.${randomInt(256)}`;
    await page.request.post("/api/auth/sign-up/email", {
      data: { name: "Nguyễn Việt", email: emailFor(testInfo), password: "correct-horse-battery" },
      headers: { "x-forwarded-for": ip },
    });
    await page.goto("/tasks");
  });

  test.afterEach(async ({}, testInfo) => {
    await deleteUser(emailFor(testInfo));
  });

  test("the sidebar reaches every section and marks the current one", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Main" });

    for (const { name, path } of sections) {
      await nav.getByRole("link", { name }).click();
      await expect(page).toHaveURL(path);
      await expect(nav.getByRole("link", { name })).toHaveAttribute("aria-current", "page");
      await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    }
  });

  test("New task opens the task form", async ({ page }) => {
    await page.getByRole("link", { name: "New task" }).click();

    await expect(page).toHaveURL("/tasks/new");
  });

  test("the sidebar shows the account and no made-up numbers", async ({ page }, testInfo) => {
    const nav = page.getByRole("navigation", { name: "Main" });

    await expect(nav.getByText("Nguyễn Việt")).toBeVisible();
    await expect(nav.getByText(emailFor(testInfo))).toBeVisible();
    await expect(nav.getByText("Current streak")).toHaveCount(0);
    await expect(nav.getByText("PROJECTS")).toHaveCount(0);
  });

  test("every sidebar control shows focus from the keyboard", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

    for (let stop = 0; stop < 8; stop++) {
      await page.keyboard.press("Tab");
      await expect(page.locator(":focus")).toHaveCSS("outline-style", "solid");
    }
  });

  for (const width of [1024, 1440]) {
    test(`no horizontal scroll at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });

      await expect(page.getByRole("heading", { name: "My tasks" })).toBeVisible();
      await expectNoHorizontalScroll(page);
    });
  }
});
