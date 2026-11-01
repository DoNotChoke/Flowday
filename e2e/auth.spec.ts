import { once } from "node:events";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { expect, test, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";
import { createOAuthClient, deleteOAuthClient, deleteUser, expectNoHorizontalScroll, verifyEmail } from "./helpers";

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
  await verifyEmail(emailFor(testInfo));
}

async function signIn(page: Page, testInfo: TestInfo, secret = password) {
  await page.getByLabel("Email").fill(emailFor(testInfo));
  await page.getByLabel("Password", { exact: true }).fill(secret);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test("signing up, signing out and signing in again works", async ({ page, isMobile }, testInfo) => {
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill("Nguyễn Việt");
  await page.getByLabel("Email").fill(emailFor(testInfo));
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await verifyEmail(emailFor(testInfo));

  await page.goto("/sign-in");
  await signIn(page, testInfo);
  await expect(page).toHaveURL("/tasks");
  if (isMobile) await page.getByRole("button", { name: "Account" }).click();
  await expect(page.getByText("Nguyễn Việt").filter({ visible: true })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/sign-in");

  await page.goBack();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();

  await page.goto("/sign-in");
  await signIn(page, testInfo);
  await expect(page).toHaveURL("/tasks");
  if (isMobile) await page.getByRole("button", { name: "Account" }).click();
  await expect(page.getByText("Nguyễn Việt").filter({ visible: true })).toBeVisible();
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
  const api = await request.get("/api/mcp", { maxRedirects: 0 });
  expect(api.status()).toBe(401);

  const wellKnown = await request.get("/.well-known/oauth-protected-resource", { maxRedirects: 0 });
  expect(wellKnown.status()).toBe(404);
});

test.describe("connecting an MCP client", () => {
  let redirectUri: string;
  let callbackServer: Server;
  const verifier = randomBytes(32).toString("base64url");
  let clientId: string;

  test.beforeEach(async () => {
    callbackServer = createServer((_, response) => response.end("ok")).listen(0);
    await once(callbackServer, "listening");
    redirectUri = `http://localhost:${(callbackServer.address() as AddressInfo).port}/callback`;
    // Registered without a port, like Claude Code, which then picks any free port.
    clientId = await createOAuthClient("http://localhost/callback");
  });

  test.afterEach(async () => {
    await deleteOAuthClient(clientId);
    callbackServer.close();
  });

  function authorizeUrl(baseURL: string | undefined) {
    const query = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "openid profile offline_access tasks:read tasks:write",
      state: "xyz",
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256",
      resource: `${baseURL}/api/mcp`,
    });
    return `/api/auth/oauth2/authorize?${query}`;
  }

  test("sign-in, consent, token, refresh and whoami work end to end", async ({ page, request, baseURL, playwright }, testInfo) => {
    await register(request, testInfo);
    // Claude calls from a server, without the cookies register() left in `request`.
    const claude = await playwright.request.newContext({ baseURL });

    await page.goto(authorizeUrl(baseURL));
    await expect(page).toHaveURL(/\/sign-in\?/);
    await signIn(page, testInfo);

    await expect(page).toHaveURL(/\/oauth\/consent\?/);
    await expect(page.getByRole("heading", { name: "Allow E2E Client" })).toBeVisible();
    await expect(page.getByText("localhost", { exact: true })).toBeVisible();
    await expect(page.getByText("runs on this device")).toBeVisible();
    await page.getByRole("button", { name: "Allow" }).click();

    await page.waitForURL(`${redirectUri}?*`);
    const callback = new URL(page.url()).searchParams;
    expect(callback.get("state")).toBe("xyz");

    const tokenResponse = await claude.post("/api/auth/oauth2/token", {
      form: {
        grant_type: "authorization_code",
        code: callback.get("code")!,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: verifier,
        resource: `${baseURL}/api/mcp`,
      },
    });
    expect(tokenResponse.status(), await tokenResponse.text()).toBe(200);
    const tokens = await tokenResponse.json();

    const whoami = await claude.post("/api/mcp", {
      headers: {
        authorization: `Bearer ${tokens.access_token}`,
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-11-25",
      },
      data: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "whoami", arguments: {} } },
    });
    expect(await whoami.text()).toContain(emailFor(testInfo));

    const refreshResponse = await claude.post("/api/auth/oauth2/token", {
      form: {
        grant_type: "refresh_token",
        refresh_token: tokens.refresh_token,
        client_id: clientId,
        resource: `${baseURL}/api/mcp`,
      },
    });
    expect(refreshResponse.status(), await refreshResponse.text()).toBe(200);
    expect((await refreshResponse.json()).refresh_token).not.toBe(tokens.refresh_token);
  });

  test("denying sends an error back to the client, with no code", async ({ page, request, baseURL }, testInfo) => {
    await register(request, testInfo);
    await page.goto(authorizeUrl(baseURL));
    await signIn(page, testInfo);

    await page.getByRole("button", { name: "Deny" }).click();

    await page.waitForURL(`${redirectUri}?*`);
    const callback = new URL(page.url()).searchParams;
    expect(callback.get("error")).toBe("access_denied");
    expect(callback.has("code")).toBe(false);
  });
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

test("signing up with the keyboard alone asks to check the inbox", async ({ page }, testInfo) => {
  await page.goto("/sign-up");
  await expect(page.getByRole("button", { name: "Create account" })).toBeEnabled();

  await page.getByLabel("Full name").focus();
  await page.keyboard.type("Nguyễn Việt");
  await page.keyboard.press("Tab");
  await page.keyboard.type(emailFor(testInfo));
  await page.keyboard.press("Tab");
  await page.keyboard.type(password);
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await expect(page.getByText(emailFor(testInfo))).toBeVisible();
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

test("an email already registered looks like a new sign-up, revealing nothing", async ({ page, request }, testInfo) => {
  await request.post("/api/auth/sign-up/email", {
    data: { name: "Taken", email: emailFor(testInfo), password },
    headers: { "x-forwarded-for": clientIp() },
  });
  await page.goto("/sign-up");

  await page.getByLabel("Full name").fill("Second");
  await page.getByLabel("Email").fill(emailFor(testInfo));
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
});

test("the inbox screen can send the link again", async ({ page }, testInfo) => {
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill("Again");
  await page.getByLabel("Email").fill(emailFor(testInfo));
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await page.getByRole("button", { name: "Send it again" }).click();

  await expect(page.getByText("Sent. Check your inbox.")).toBeVisible();
});

test("signing in before verifying explains what to do", async ({ page, request }, testInfo) => {
  await request.post("/api/auth/sign-up/email", {
    data: { name: "Unverified", email: emailFor(testInfo), password },
    headers: { "x-forwarded-for": clientIp() },
  });
  await page.goto("/sign-in");

  await signIn(page, testInfo);

  await expect(page.getByText("Verify your email first")).toBeVisible();
  await expect(page).toHaveURL("/sign-in");
});

test("arriving from a verification link says how it went", async ({ page }) => {
  await page.goto("/sign-in?verified=1");
  await expect(page.getByText("Email verified. Sign in to continue.")).toBeVisible();

  await page.goto("/sign-in?verified=1&error=TOKEN_EXPIRED");
  await expect(page.getByText("This link is invalid or has expired")).toBeVisible();
  await expect(page.getByText("Email verified")).toHaveCount(0);
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
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
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
