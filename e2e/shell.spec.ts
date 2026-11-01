import { randomInt } from "node:crypto";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
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

async function signUp(page: Page, testInfo: TestInfo) {
  const ip = `10.${randomInt(256)}.${randomInt(256)}.${randomInt(256)}`;
  await page.request.post("/api/auth/sign-up/email", {
    data: { name: "Nguyễn Việt", email: emailFor(testInfo), password: "correct-horse-battery" },
    headers: { "x-forwarded-for": ip },
  });
}

test.afterEach(async ({}, testInfo) => {
  await deleteUser(emailFor(testInfo));
});

for (const path of [...sections.map((section) => section.path), "/tasks/new"]) {
  test(`${path} sends a signed-out visitor to sign-in`, async ({ page }) => {
    await page.goto(path);

    await expect(page).toHaveURL(/\/sign-in\?next=/);
  });
}

test.describe("signed in on a wide screen", () => {
  test.skip(({ isMobile }) => isMobile, "the sidebar starts at 1024 px");

  test.beforeEach(async ({ page }, testInfo) => {
    await signUp(page, testInfo);
    await page.goto("/tasks");
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

test.describe("signed in on a narrow screen", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signUp(page, testInfo);
    await page.goto("/tasks");
  });

  for (const width of [360, 390, 744, 820]) {
    test(`bottom nav fits with no horizontal scroll at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });

      await expect(page.getByRole("navigation", { name: "Sections" })).toBeVisible();
      await expectNoHorizontalScroll(page);
    });
  }

  test("the layout switches exactly at 1024 px", async ({ page }) => {
    const bottomNav = page.getByRole("navigation", { name: "Sections" });
    const sidebar = page.getByRole("navigation", { name: "Main" });

    await page.setViewportSize({ width: 1023, height: 800 });
    await expect(bottomNav).toBeVisible();
    await expect(sidebar).toBeHidden();

    await page.setViewportSize({ width: 1024, height: 800 });
    await expect(sidebar).toBeVisible();
    await expect(bottomNav).toBeHidden();
  });

  test("the bottom nav reaches its sections and marks the current one", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Sections" });

    for (const [name, path] of [["Calendar", "/calendar"], ["History", "/history"], ["Focus", "/focus"], ["Tasks", "/tasks"]]) {
      await nav.getByRole("link", { name }).click();
      await expect(page).toHaveURL(path);
      await expect(nav.getByRole("link", { name })).toHaveAttribute("aria-current", "page");
    }

    await nav.getByRole("link", { name: "New task" }).click();
    await expect(page).toHaveURL("/tasks/new");
  });

  test("the bottom nav never covers the end of the page", async ({ page }) => {
    const nav = await page.getByRole("navigation", { name: "Sections" }).boundingBox();
    const padding = await page.locator("main").evaluate((main) => parseFloat(getComputedStyle(main).paddingBottom));

    expect(padding).toBeGreaterThan(nav!.height);
  });

  test("Esc closes the account drawer and returns focus to its button", async ({ page }, testInfo) => {
    const button = page.getByRole("button", { name: "Account" });
    await button.click();

    const drawer = page.getByRole("dialog", { name: "Account" });
    await expect(drawer.getByText("Nguyễn Việt")).toBeVisible();
    await expect(drawer.getByText(emailFor(testInfo))).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(button).toBeFocused();
  });

  test("Settings is reached from the drawer, which then closes", async ({ page }) => {
    await page.getByRole("button", { name: "Account" }).click();
    const drawer = page.getByRole("dialog", { name: "Account" });

    await drawer.getByRole("link", { name: "Settings" }).click();

    await expect(page).toHaveURL("/settings");
    await expect(drawer).toBeHidden();
  });

  test("every control is at least 44 px on touch screens", async ({ page, hasTouch }) => {
    test.skip(!hasTouch, "touch only");
    const controls = page.locator("header a, header button, nav a").filter({ visible: true });

    await expect(controls).not.toHaveCount(0);
    for (const control of await controls.all()) {
      const box = await control.boundingBox();
      expect(box!.height, await control.innerText()).toBeGreaterThanOrEqual(44);
    }
  });
});
