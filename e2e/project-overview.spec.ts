import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { completeTask, deleteUser, expectNoHorizontalScroll, signInNewUser, tasksOf } from "./helpers";

test.describe.configure({ timeout: 60_000 });

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
  const overview = page.url();
  await page.getByRole("link", { name: "Add task", exact: true }).click();
  await expect(page.getByRole("button", { name: "Create Task" })).toBeEnabled();
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(/.+/);

  await page.getByLabel("Task name").fill("Quá hạn rồi");
  await page.getByLabel("Due date").fill("2026-01-01");
  await page.getByRole("button", { name: "Create Task" }).click();
  await expect(page).toHaveURL("/tasks");

  await page.goto(overview);
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

test("editing saves every field and keeps the prefix", async ({ page }) => {
  await page.getByRole("link", { name: "Project settings" }).click();
  await expect(page.getByRole("button", { name: "Save changes" })).toBeEnabled();
  await expect(page.getByRole("textbox", { name: "Project name" })).toHaveValue("Đồ án tốt nghiệp");
  await expect(page.getByRole("textbox", { name: "Task prefix" })).toHaveValue("DAT");
  await expect(page.getByLabel("Target end date").filter({ visible: true })).toHaveValue("2030-01-15");
  await expect(page.getByText("Start from a template").filter({ visible: true })).toHaveCount(0);

  await page.getByRole("textbox", { name: "Project name" }).fill("Luận văn");
  await page.getByRole("textbox", { name: "Goal & description" }).fill("Mục tiêu mới");
  await page.getByRole("spinbutton", { name: "Time budget (hours)" }).fill("40");
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByRole("heading", { name: "Luận văn" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Luận văn" })).toBeVisible();
  await expect(page.getByText("Mục tiêu mới")).toBeVisible();
  await expect(page.getByText("DAT · Software sprint").filter({ visible: true })).toBeVisible();
});

test("archiving needs a confirmation, hides the project, and restoring brings it back", async ({ page }, testInfo) => {
  const overview = page.url();
  await page.getByRole("link", { name: "Project settings" }).click();
  await page.getByRole("button", { name: "Archive project" }).click();
  await page.getByRole("button", { name: "Keep project" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByRole("button", { name: "Archive project" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Archive", exact: true }).click();
  await expect(page.getByText("This project is archived").filter({ visible: true })).toBeVisible();

  await page.goto("/tasks/new");
  await expect(page.getByRole("button", { name: "Create Task" })).toBeEnabled();
  await expect(page.getByLabel("Project", { exact: true }).getByRole("option", { name: "Đồ án tốt nghiệp" })).toHaveCount(0);

  await page.goto("/tasks");
  const card = page.getByRole("link", { name: /Build auth flow/ });
  await expect(card).toContainText("Đồ án tốt nghiệp");
  await card.click();

  await page.getByRole("button", { name: /^Project/ }).click();
  await expect(page.getByRole("dialog").getByLabel("Project")).toHaveValue(/.+/);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.reload();
  await expect(page.getByRole("button", { name: /^Project/ })).toContainText("Đồ án tốt nghiệp");
  expect((await tasksOf(emailFor(testInfo))).length).toBe(4);

  await page.goto(overview);
  await page.getByRole("button", { name: "Restore project" }).click();
  await expect(page.getByText("This project is archived")).toHaveCount(0);
});

test.describe("project tasks", () => {
  const table = (page: Page) => page.getByRole("region", { name: "Project tasks" });
  const filters = (page: Page) => page.getByRole("group", { name: "Filter by status" });

  test("the status filter stays in the address, with a count on each", async ({ page }, testInfo) => {
    await completeTask(emailFor(testInfo), "Build auth flow");
    await page.reload();
    await expect(filters(page).getByRole("link", { name: "All 4" })).toBeVisible();
    await expect(filters(page).getByRole("link", { name: "Completed 1" })).toBeVisible();
    await expect(filters(page).getByRole("link", { name: "On going 3" })).toBeVisible();

    await filters(page).getByRole("link", { name: /Completed/ }).click();
    await expect(page).toHaveURL(/\?status=completed$/);
    await expect(table(page).getByRole("link", { name: /Build auth flow/ })).toBeVisible();
    await expect(table(page).getByRole("link", { name: /Design data model/ })).toHaveCount(0);

    await page.reload();
    await expect(table(page).getByRole("link", { name: /Design data model/ })).toHaveCount(0);

    await filters(page).getByRole("link", { name: /Canceled/ }).click();
    await expect(table(page).getByText("No tasks here")).toBeVisible();
  });

  test("a row shows its code and opens the task", async ({ page }) => {
    await expect(table(page).getByRole("link", { name: /Build auth flow/ })).toContainText("DAT-3");

    await table(page).getByRole("link", { name: /Build auth flow/ }).click();
    await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]{36}$/);
  });

  test("an overdue task is red until it is done", async ({ page }, testInfo) => {
    const overview = page.url();
    await page.getByRole("link", { name: "+ Add task to" }).click();
    await expect(page.getByRole("button", { name: "Create Task" })).toBeEnabled();
    await page.getByLabel("Task name").fill("Quá hạn rồi");
    await page.getByLabel("Due date").fill("2026-01-01");
    await page.getByRole("button", { name: "Create Task" }).click();
    await expect(page).toHaveURL("/tasks");

    await page.goto(overview);
    const due = table(page).getByRole("row", { name: /Quá hạn rồi/ }).getByText("Jan 1");
    await expect(due).toHaveCSS("color", "rgb(194, 65, 42)");

    await completeTask(emailFor(testInfo), "Quá hạn rồi");
    await page.reload();
    await expect(due).not.toHaveCSS("color", "rgb(194, 65, 42)");
  });

  test("phones get cards, wider screens get a table", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await expect(table(page).locator("table")).toHaveCSS("display", "block");
    await expect(table(page).locator("thead")).toBeHidden();
    await expectNoHorizontalScroll(page);

    await page.setViewportSize({ width: 820, height: 800 });
    await expect(table(page).locator("table")).toHaveCSS("display", "table");
    await expect(table(page).locator("thead")).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});

test.describe("project views", () => {
  const views = (page: Page) => page.getByRole("navigation", { name: "Project views" });
  const column = (page: Page, name: string) => page.getByRole("region", { name });

  test("the tabs stay in the address and survive a reload", async ({ page }) => {
    const overview = page.url();
    await views(page).getByRole("link", { name: "Board" }).click();
    await expect(page).toHaveURL(/\?view=board$/);
    await expect(column(page, "On going").getByRole("link", { name: /Build auth flow/ })).toBeVisible();
    await expect(summary(page)).toHaveCount(0);

    await page.reload();
    await expect(views(page).getByRole("link", { name: "Board" })).toHaveAttribute("aria-current", "page");
    await expect(column(page, "On going").getByRole("link", { name: /Build auth flow/ })).toBeVisible();

    await views(page).getByRole("link", { name: "List" }).click();
    await expect(page).toHaveURL(/\?view=list$/);
    await expect(page.getByRole("listitem").filter({ hasText: "Build auth flow" })).toBeVisible();

    await views(page).getByRole("link", { name: "Overview" }).click();
    await expect(page).toHaveURL(overview);
    await expect(summary(page)).toBeVisible();
  });

  test("only this project's tasks are on the board", async ({ page }) => {
    const board = page.url();
    await page.goto("/tasks/new");
    await expect(page.getByRole("button", { name: "Create Task" })).toBeEnabled();
    await page.getByLabel("Task name").fill("Ngoài project");
    await page.getByRole("button", { name: "Create Task" }).click();
    await expect(page).toHaveURL("/tasks");

    await page.goto(`${board}?view=board`);
    await expect(column(page, "On going").getByRole("link", { name: /Build auth flow/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Ngoài project/ })).toHaveCount(0);
  });

  test("moving a card here also moves it on /tasks", async ({ page, isMobile }, testInfo) => {
    await views(page).getByRole("link", { name: "Board" }).click();
    const card = column(page, "On going").getByRole("link", { name: /Build auth flow/ });
    await expect(card).toBeVisible();
    const saved = page.waitForResponse((response) => response.request().method() === "POST" && response.url().includes("/projects/"));

    if (isMobile) {
      await page.getByRole("button", { name: "Move Build auth flow" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Completed" }).click();
    } else {
      const start = (await card.boundingBox())!;
      const target = (await column(page, "Completed").boundingBox())!;
      await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
      await page.mouse.down();
      await page.mouse.move(start.x + start.width / 2 + 12, start.y + start.height / 2 + 12, { steps: 4 });
      await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 12 });
      await page.mouse.up();
    }
    await saved;

    expect((await tasksOf(emailFor(testInfo))).find((row) => row.title === "Build auth flow")?.status).toBe("completed");
    await page.goto("/tasks");
    if (isMobile) await page.getByRole("group", { name: "Status" }).getByRole("button", { name: /Completed/ }).click();
    await expect(column(page, "Completed").getByRole("link", { name: /Build auth flow/ })).toBeVisible();
  });

  for (const view of ["board", "list"]) {
    test(`the ${view} tab has no horizontal scroll at 360 px`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto(`${page.url()}?view=${view}`);

      await expect(views(page)).toBeVisible();
      await expect(summary(page)).toHaveCount(0);
      await expectNoHorizontalScroll(page);
    });
  }
});

test.describe("milestones", () => {
  const block = (page: Page) => page.getByRole("region", { name: "Milestones" });
  const dialog = (page: Page) => page.getByRole("dialog");

  async function add(page: Page, name: string, date?: string) {
    await page.getByRole("button", { name: "+ Milestone" }).click();
    await dialog(page).getByLabel("Milestone name").fill(name);
    if (date) await dialog(page).getByLabel("Due date").fill(date);
    await dialog(page).getByRole("button", { name: "Save" }).click();
    await expect(dialog(page)).toHaveCount(0);
  }

  test("a new project has none and says so", async ({ page }) => {
    await expect(block(page).getByText("No milestones yet")).toBeVisible();
  });

  test("a milestone can be added, edited and deleted", async ({ page }) => {
    await add(page, "Bảo vệ đề cương", "2030-03-01");
    await add(page, "Nộp luận văn");

    await page.reload();
    await expect(block(page).getByRole("listitem")).toHaveCount(2);
    const first = block(page).getByRole("button", { name: /Bảo vệ đề cương/ });
    await expect(first).toContainText("Mar 1");
    await expect(block(page).getByRole("button", { name: /Nộp luận văn/ })).toContainText("No date");

    await first.click();
    await expect(dialog(page).getByLabel("Milestone name")).toHaveValue("Bảo vệ đề cương");
    await dialog(page).getByLabel("Milestone name").fill("Bảo vệ thử");
    await dialog(page).getByRole("button", { name: "Save" }).click();
    await expect(block(page).getByRole("button", { name: /Bảo vệ thử/ })).toBeVisible();

    await block(page).getByRole("button", { name: /Bảo vệ thử/ }).click();
    await dialog(page).getByRole("button", { name: "Delete milestone" }).click();
    await expect(block(page).getByRole("listitem")).toHaveCount(1);

    await page.reload();
    await expect(block(page).getByRole("button", { name: /Bảo vệ thử/ })).toHaveCount(0);
  });

  test("a task joins a milestone, and finishing it moves the milestone", async ({ page }, testInfo) => {
    const overview = page.url();
    await add(page, "Bản nháp");
    const card = block(page).getByRole("button", { name: /Bản nháp/ });
    await expect(card).toContainText("Planned");

    await page.getByRole("region", { name: "Project tasks" }).getByRole("link", { name: /Build auth flow/ }).click();
    await page.getByRole("button", { name: /^Milestone/ }).click();
    await dialog(page).getByLabel("Milestone").selectOption({ label: "Bản nháp" });
    await dialog(page).getByRole("button", { name: "Save" }).click();
    await expect(dialog(page)).toBeHidden();
    await page.reload();
    await expect(page.getByRole("button", { name: /^Milestone/ })).toContainText("Bản nháp");
    await expect(page.getByRole("list", { name: "Activity" })).toContainText("changed the milestone");

    await page.goto(overview);
    await expect(card).toContainText("0% · 1 task");

    await completeTask(emailFor(testInfo), "Build auth flow");
    await page.reload();
    await expect(card).toContainText("Done");
    await expect(card).toContainText("100% · 1 task");
  });

  test("a task with no project has no milestone field", async ({ page }) => {
    await page.goto("/tasks/new");
    await expect(page.getByRole("button", { name: "Create Task" })).toBeEnabled();
    await page.getByLabel("Task name").fill("Không project");
    await page.getByRole("button", { name: "Create Task" }).click();
    await expect(page).toHaveURL("/tasks");

    await page.getByRole("link", { name: /Không project/ }).click();
    await expect(page.getByRole("button", { name: /^Deadline/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Milestone/ })).toHaveCount(0);
  });

  test("a blank name is refused and the sheet stays open", async ({ page }) => {
    await page.getByRole("button", { name: "+ Milestone" }).click();
    await dialog(page).getByLabel("Milestone name").fill("   ");
    await dialog(page).getByRole("button", { name: "Save" }).click();

    await expect(dialog(page).getByRole("alert")).toContainText("Enter a milestone name.");
  });
});

test("time logged and the burndown come from the project's estimates", async ({ page }) => {
  await expect(summary(page)).toContainText(/Time logged vs estimate\s*0h \/ \d+(\.\d)?h/);
  await expect(summary(page)).toContainText("No budget set");

  const burndown = page.getByRole("region", { name: "Burndown" });
  await expect(burndown.getByRole("img")).toHaveAccessibleName(/estimated hours left\.$/);
  await expectNoHorizontalScroll(page);
});
