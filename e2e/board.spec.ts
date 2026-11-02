import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { deleteUser, expectNoHorizontalScroll, signInNewUser, tasksOf } from "./helpers";

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
  return page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/tasks");
}

test.beforeEach(async ({ page }, testInfo) => {
  await signInNewUser(page, emailFor(testInfo));
  await addTask(page, "Viết chương ba");
});

test.afterEach(async ({}, testInfo) => {
  await deleteUser(emailFor(testInfo));
});

test.describe("with a mouse and a wide screen", () => {
  test.skip(({ isMobile }) => isMobile, "dragging needs a mouse, touch uses Move to");

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

  test("the list moves a task with Move to", async ({ page }, testInfo) => {
    await page.goto("/tasks?view=list");
    await page.getByRole("button", { name: "Move Viết chương ba" }).click();
    const response = saved(page);
    await page.getByRole("dialog").getByRole("button", { name: "In process" }).click();
    await response;

    await expect(page.getByRole("listitem").filter({ hasText: "Viết chương ba" })).toContainText("In process");
    expect((await tasksOf(emailFor(testInfo)))[0].status).toBe("in_process");
  });
});

test.describe("on a touch screen", () => {
  test.skip(({ hasTouch }) => !hasTouch, "touch only");

  test("the phone shows one status at a time", async ({ page }) => {
    await expect(column(page, "On going")).toBeVisible();
    await expect(column(page, "Completed")).toBeHidden();

    await page.getByRole("group", { name: "Status" }).getByRole("button", { name: /Completed/ }).click();

    await expect(column(page, "Completed")).toBeVisible();
    await expect(column(page, "On going")).toBeHidden();
  });

  for (const width of [390, 820]) {
    test(`Move to changes the status at ${width} px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 844 });
      await page.getByRole("button", { name: "Move Viết chương ba" }).click();
      const response = saved(page);
      await page.getByRole("dialog").getByRole("button", { name: "Completed" }).click();
      await response;

      await expect(page.getByRole("dialog")).toBeHidden();
      await expect(page.getByRole("region", { name: "Task status" })).toContainText("Completed1 Tasks");
      expect((await tasksOf(emailFor(testInfo)))[0].status).toBe("completed");
    });
  }

  test("a failed Move to says so", async ({ page }) => {
    await page.route("/tasks", (route) => (route.request().method() === "POST" ? route.abort() : route.continue()));
    await page.getByRole("button", { name: "Move Viết chương ba" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Completed" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "Could not move" })).toBeVisible();
    await expect(column(page, "On going").getByRole("link", { name: /Viết chương ba/ })).toBeVisible();
  });

  test("the tablet shows the columns two by two", async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    const first = await column(page, "On going").boundingBox();
    const second = await column(page, "In process").boundingBox();
    const third = await column(page, "Completed").boundingBox();

    expect(second!.y).toBe(first!.y);
    expect(third!.x).toBe(first!.x);
    expect(third!.y).toBeGreaterThan(first!.y);
  });
});

test("the view stays in the address and survives a reload", async ({ page }) => {
  await page.getByRole("group", { name: "View" }).getByRole("link", { name: "List" }).click();
  await expect(page).toHaveURL("/tasks?view=list");
  await expect(page.getByRole("listitem").filter({ hasText: "Viết chương ba" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("listitem").filter({ hasText: "Viết chương ba" })).toBeVisible();
  await expect(page.getByRole("region", { name: "On going" })).toHaveCount(0);

  await page.getByRole("group", { name: "View" }).getByRole("link", { name: "Board" }).click();
  await expect(page).toHaveURL("/tasks");
  await expect(column(page, "On going")).toBeVisible();
});

for (const path of ["/tasks", "/tasks?view=list"]) {
  for (const width of [360, 390, 744, 820, 1180]) {
    test(`${path} has no horizontal scroll at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);

      await expect(page.getByRole("heading", { name: "Hi, Việt" })).toBeVisible();
      await expectNoHorizontalScroll(page);
    });
  }
}

test.describe("search", () => {
  const box = (page: Page) => page.getByRole("searchbox", { name: "Search tasks" });
  const results = (page: Page) => page.getByRole("list", { name: "Search results" });

  test("typing without accents finds the task and opens it", async ({ page }) => {
    await box(page).fill("viet chuong");
    await results(page).getByRole("link", { name: /Viết chương ba/ }).click();

    await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]{36}$/);
  });

  test("nothing found says so and Escape clears the box", async ({ page }) => {
    await box(page).fill("không có gì");
    await expect(page.getByText("No tasks found")).toBeVisible();

    await box(page).press("Escape");
    await expect(box(page)).toHaveValue("");
    await expect(page.getByText("No tasks found")).toHaveCount(0);
  });

  test("clicking outside closes the results", async ({ page }) => {
    await box(page).fill("viet");
    await expect(results(page)).toBeVisible();

    await page.getByRole("heading", { name: "Hi, Việt" }).click();
    await expect(results(page)).toHaveCount(0);
  });

  test("Ctrl+K jumps to the box, unless typing elsewhere", async ({ page, isMobile }) => {
    test.skip(isMobile, "needs a keyboard");
    await expect(box(page)).toBeEnabled();
    await page.keyboard.press("Control+k");
    await expect(box(page)).toBeFocused();

    await page.evaluate(() => {
      const other = document.createElement("input");
      other.id = "other";
      document.body.append(other);
      other.focus();
    });
    await page.keyboard.press("Control+k");
    await expect(page.locator("#other")).toBeFocused();
  });

  test("the shortcut hint is hidden on touch screens", async ({ page, hasTouch }) => {
    const hint = page.getByText("Ctrl K");

    if (hasTouch) await expect(hint).toBeHidden();
    else await expect(hint).toBeVisible();
  });
});
