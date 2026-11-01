import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { deleteUser, signInNewUser, tasksOf } from "./helpers";


function emailFor(testInfo: TestInfo) {
  return `e2e-board-${testInfo.project.name}@flowday.test`;
}

function column(page: Page, name: string) {
  return page.getByRole("region", { name });
}

async function addTask(page: Page, title: string) {
  await page.goto("/tasks/new");
  await expect(page.getByRole("button", { name: "Create Task" })).toBeEnabled();
  await page.getByLabel("Task name").fill(title);
  await page.getByRole("button", { name: "Create Task" }).click();
  await expect(page).toHaveURL("/tasks");
}

async function drag(page: Page, from: { x: number; y: number; width: number; height: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2 + 12, { steps: 4 });
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.move(to.x + 1, to.y + 1);
  await page.mouse.up();
}

function saved(page: Page) {
  return page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/tasks"));
}

test.beforeEach(async ({ page, isMobile }, testInfo) => {
  test.skip(isMobile, "columns stack until T2.6 adds tabs and the Move to menu");
  await signInNewUser(page, emailFor(testInfo));
  await addTask(page, "Viết chương ba");
});

test.afterEach(async ({}, testInfo) => {
  await deleteUser(emailFor(testInfo));
});

test("dragging a card to another column is saved and counted", async ({ page }, testInfo) => {
  const card = await column(page, "On going").getByRole("link", { name: /Viết chương ba/ }).boundingBox();
  const target = await column(page, "Completed").boundingBox();
  const response = saved(page);
  await drag(page, card!, { x: target!.x + target!.width / 2, y: target!.y + target!.height / 2 });
  await response;

  await expect(column(page, "Completed").getByRole("link", { name: /Viết chương ba/ })).toBeVisible();
  await expect(page).toHaveURL("/tasks");
  await expect(page.getByRole("region", { name: "Task status" })).toContainText("Completed1 Tasks");
  await expect(column(page, "Completed").getByText("100%")).toBeVisible();

  await page.reload();
  await expect(column(page, "Completed").getByRole("link", { name: /Viết chương ba/ })).toBeVisible();
  const [task] = await tasksOf(emailFor(testInfo));
  expect(task.status).toBe("completed");
});

test("dragging a card over another reorders the column", async ({ page }) => {
  await addTask(page, "Chương bốn");
  const links = column(page, "On going").getByRole("link", { name: /Chương|chương/ });
  await expect(links).toHaveText([/chương ba/, /Chương bốn/]);

  const last = await links.nth(1).boundingBox();
  const first = await links.nth(0).boundingBox();
  const response = saved(page);
  await drag(page, last!, { x: first!.x + first!.width / 2, y: first!.y + 10 });
  await response;

  await expect(links).toHaveText([/Chương bốn/, /chương ba/]);
  await page.reload();
  await expect(links).toHaveText([/Chương bốn/, /chương ba/]);
});

test("a plain click still opens the task", async ({ page }) => {
  await column(page, "On going").getByRole("link", { name: /Viết chương ba/ }).click();

  await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]{36}$/);
});

test("the keyboard moves a card to the next column, and Enter still opens it", async ({ page }, testInfo) => {
  const card = column(page, "On going").getByRole("link", { name: /Viết chương ba/ });
  await card.focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("status").filter({ hasText: "is over On going" })).toBeAttached();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("status").filter({ hasText: "is over In process" })).toBeAttached();
  await page.keyboard.press("Space");

  const moved = column(page, "In process").getByRole("link", { name: /Viết chương ba/ });
  await expect(moved).toBeVisible();
  await expect.poll(async () => (await tasksOf(emailFor(testInfo)))[0].status).toBe("in_process");

  await moved.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]{36}$/);
});

test("Esc cancels a keyboard move", async ({ page }) => {
  const card = column(page, "On going").getByRole("link", { name: /Viết chương ba/ });
  await card.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Escape");

  await expect(column(page, "On going").getByRole("link", { name: /Viết chương ba/ })).toBeVisible();
});

test("a failed move puts the card back and says so", async ({ page }, testInfo) => {
  await page.route("/tasks", (route) => (route.request().method() === "POST" ? route.abort() : route.continue()));

  const card = await column(page, "On going").getByRole("link", { name: /Viết chương ba/ }).boundingBox();
  const target = await column(page, "Completed").boundingBox();
  await drag(page, card!, { x: target!.x + target!.width / 2, y: target!.y + target!.height / 2 });

  await expect(page.getByRole("alert").filter({ hasText: "Could not move" })).toBeVisible();
  await expect(column(page, "On going").getByRole("link", { name: /Viết chương ba/ })).toBeVisible();
  const [task] = await tasksOf(emailFor(testInfo));
  expect(task.status).toBe("ongoing");
});
