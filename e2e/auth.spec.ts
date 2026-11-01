import { randomInt } from "node:crypto";
import { expect, test, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";
import { deleteUser, expectNoHorizontalScroll } from "./helpers";

const password = "correct-horse-battery";

function emailFor(testInfo: TestInfo) {
  return `e2e-${testInfo.project.name}@flowday.test`;
}

// Production allows 3 sign-ups per IP every 10 seconds, so each test needs its own address.
const clientIp = () => `10.${randomInt(256)}.${randomInt(256)}.${randomInt(256)}`;

test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": clientIp() });
});

test.afterEach(async ({}, testInfo) => {
  await deleteUser(emailFor(testInfo));
});

async function register(request: APIRequestContext, testInfo: TestInfo) {
  await request.post("/api/auth/sign-up/email", {
    data: { name: "Nguyễn Việt", email: emailFor(testInfo), password },
    headers: { "x-forwarded-for": clientIp() },
  });
}

async function signIn(page: Page, testInfo: TestInfo, secret = password) {
  await page.getByLabel("Email").fill(emailFor(testInfo));
  await page.getByLabel("Password", { exact: true }).fill(secret);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test("signing up, signing out and signing in again works", async ({ page }, testInfo) => {
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill("Nguyễn Việt");
  await page.getByLabel("Email").fill(emailFor(testInfo));
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Nguyễn Việt")).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/sign-in");

  await page.goBack();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();

  await page.goto("/sign-in");
  await signIn(page, testInfo);
  await expect(page).toHaveURL("/tasks");
  await expect(page.getByText("Nguyễn Việt")).toBeVisible();
});

test("a signed-out visitor is sent to sign-in and returned afterwards", async ({ page, request }, testInfo) => {
  await register(request, testInfo);

  await page.goto("/tasks?view=list");
  await expect(page).toHaveURL(/\/sign-in\?next=/);

  await signIn(page, testInfo);
  await expect(page).toHaveURL("/tasks?view=list");
});

for (const next of ["https://evil.example/", "//evil.example/", "/\\evil.example/"]) {
  test(`next=${next} cannot send the user off the site`, async ({ page, request }, testInfo) => {
    await register(request, testInfo);

    await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
    await signIn(page, testInfo);

    await expect(page).toHaveURL("/tasks");
  });
}

test("a wrong password and an unknown email get the same message", async ({ page, request }, testInfo) => {
  await register(request, testInfo);
  await page.goto("/sign-in");
  const message = page.getByText("Invalid email or password");

  await signIn(page, testInfo, "wrong-password");
  await expect(message).toBeVisible();

  await page.getByLabel("Email").fill("nobody@flowday.test");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(message).toBeVisible();
  await expect(page).toHaveURL("/sign-in");
});

test("keeping the session lasts 30 days, otherwise it ends with the browser", async ({ page, request, context }, testInfo) => {
  await register(request, testInfo);
  const sessionCookie = async () =>
    (await context.cookies()).find((cookie) => cookie.name.endsWith("session_token"));

  await page.goto("/sign-in");
  await signIn(page, testInfo);
  await expect(page).toHaveURL("/tasks");
  const days = ((await sessionCookie())!.expires - Date.now() / 1000) / 86_400;
  expect(Math.round(days)).toBe(30);

  await context.clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Keep me signed in for 30 days").uncheck();
  await signIn(page, testInfo);
  await expect(page).toHaveURL("/tasks");
  expect((await sessionCookie())!.expires).toBe(-1);
});

test("a forged session cookie gets past the proxy but not into the app", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "better-auth.session_token", value: "forged", url: baseURL }]);

  await page.goto("/tasks");

  await expect(page).toHaveURL(/\/sign-in/);
});

test("the proxy leaves API and well-known paths alone", async ({ request }) => {
  for (const path of ["/api/mcp", "/.well-known/oauth-protected-resource"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(404);
  }
});

test("the password can be shown and hidden", async ({ page }) => {
  await page.goto("/sign-in");
  const field = page.getByLabel("Password", { exact: true });
  await expect(field).toHaveAttribute("type", "password");

  await expect(async () => {
    await page.getByRole("button", { name: "Show password" }).click({ timeout: 500 });
    await expect(field).toHaveAttribute("type", "text", { timeout: 500 });
  }).toPass();
});

for (const width of [360, 390, 744, 1024, 1440]) {
  test(`sign-in has no horizontal scroll at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/sign-in");

    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
}

test("signing up with the keyboard alone opens the app", async ({ page }, testInfo) => {
  await page.goto("/sign-up");
  await expect(page.getByRole("button", { name: "Create account" })).toBeEnabled();

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
    headers: { "x-forwarded-for": clientIp() },
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

test("what is typed before JavaScript loads survives and can be submitted", async ({ page }, testInfo) => {
  await page.route("**/_next/static/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.goto("/sign-up", { waitUntil: "commit" });

  await page.getByLabel("Full name").fill("Early");
  await page.getByLabel("Email").fill(emailFor(testInfo));
  await page.getByLabel("Password").fill(password);
  await page.getByLabel("Password").press("Enter");

  const submit = page.getByRole("button", { name: "Create account" });
  await expect(submit).toBeEnabled({ timeout: 20_000 });
  await expect(page.getByLabel("Full name")).toHaveValue("Early");
  await submit.click();
  await expect(page).toHaveURL("/tasks");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("Enter sends nothing, so the password stays out of the URL", async ({ page }, testInfo) => {
    await page.goto("/sign-up");

    await page.getByLabel("Full name").fill("Early");
    await page.getByLabel("Email").fill(emailFor(testInfo));
    await page.getByLabel("Password").fill(password);
    await page.getByLabel("Password").press("Enter");

    await page.waitForLoadState();
    await expect(page.getByRole("button", { name: "Create account" })).toBeDisabled();
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
