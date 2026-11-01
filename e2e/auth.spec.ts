import { expect, test, type TestInfo } from "@playwright/test";
import { deleteUser, expectNoHorizontalScroll } from "./helpers";

const password = "correct-horse-battery";

function emailFor(testInfo: TestInfo) {
  return `e2e-${testInfo.project.name}@flowday.test`;
}

test.afterEach(async ({}, testInfo) => {
  await deleteUser(emailFor(testInfo));
});

test("signing up with the keyboard alone opens the app", async ({ page }, testInfo) => {
  await page.goto("/sign-up");

  await page.getByLabel("Full name").focus();
  await page.keyboard.type("Nguyễn Việt");
  await page.keyboard.press("Tab");
  await page.keyboard.type(emailFor(testInfo));
  await page.keyboard.press("Tab");
  await page.keyboard.type(password);
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL("/tasks");
});

test("an email outside the list shows the error on that field", async ({ page }) => {
  await page.goto("/sign-up");

  await page.getByLabel("Full name").fill("Stranger");
  await page.getByLabel("Email").fill("stranger@flowday.test");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  const email = page.getByLabel("Email");
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveAccessibleDescription("This email is not allowed to sign up.");
  await expect(email).toBeFocused();
  await expect(page).toHaveURL("/sign-up");
});

test("an email already registered shows the error on that field", async ({ page, request }, testInfo) => {
  await request.post("/api/auth/sign-up/email", {
    data: { name: "Taken", email: emailFor(testInfo), password },
  });
  await page.goto("/sign-up");

  await page.getByLabel("Full name").fill("Second");
  await page.getByLabel("Email").fill(emailFor(testInfo));
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
  await expect(page).toHaveURL("/sign-up");
});

test("a dropped connection shows an error and keeps what was typed", async ({ page }, testInfo) => {
  await page.goto("/sign-up");
  await page.route("/api/auth/sign-up/email", (route) => route.abort());

  await page.getByLabel("Full name").fill("Offline");
  await page.getByLabel("Email").fill(emailFor(testInfo));
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("Could not reach Flowday")).toBeVisible();
  await expect(page.getByLabel("Full name")).toHaveValue("Offline");
  await expect(page.getByRole("button", { name: "Create account" })).toBeEnabled();
});

test("the strength meter follows the password", async ({ page }) => {
  await page.goto("/sign-up");
  const field = page.getByLabel("Password");

  await expect(field).toHaveAccessibleDescription(/Use 8\+ characters/);
  // The first fill can land before hydration, when the meter is not listening yet.
  await expect(async () => {
    await field.clear();
    await field.fill("short");
    await expect(field).toHaveAccessibleDescription("Weak password", { timeout: 500 });
  }).toPass();
  await field.fill("Longenough");
  await expect(field).toHaveAccessibleDescription("Okay — add a number or symbol");
  await field.fill("Longenough1");
  await expect(field).toHaveAccessibleDescription("Good password");
  await field.fill("Longenough1!");
  await expect(field).toHaveAccessibleDescription("Strong password");
});

test("a password under 8 characters never reaches the server", async ({ page }, testInfo) => {
  await page.goto("/sign-up");
  let called = false;
  await page.route("/api/auth/sign-up/email", (route) => {
    called = true;
    return route.continue();
  });

  await page.getByLabel("Full name").fill("Short");
  await page.getByLabel("Email").fill(emailFor(testInfo));
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL("/sign-up");
  expect(called).toBe(false);
});

test.describe("before JavaScript loads", () => {
  test.use({ javaScriptEnabled: false });

  test("submitting keeps the password out of the URL", async ({ page }, testInfo) => {
    await page.goto("/sign-up");

    await page.getByLabel("Full name").fill("Early");
    await page.getByLabel("Email").fill(emailFor(testInfo));
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();

    await page.waitForLoadState();
    expect(page.url()).not.toContain(password);
  });
});

for (const width of [360, 390, 744, 1024, 1440]) {
  test(`sign-up has no horizontal scroll at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/sign-up");

    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
}

test("inputs stay at 16 px on touch screens so iOS does not zoom", async ({ page, hasTouch }) => {
  test.skip(!hasTouch, "touch only");
  await page.goto("/sign-up");

  await expect(page.getByLabel("Email")).toHaveCSS("font-size", "16px");
});
