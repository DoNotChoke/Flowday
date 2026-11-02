import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { createProjects, deleteUser, expectNoHorizontalScroll, signInNewUser, tasksOf } from "./helpers";

function emailFor(testInfo: TestInfo) {
  return `e2e-detail-${testInfo.project.name}@flowday.test`;
}

function edit(page: Page, name: RegExp) {
  return page.getByRole("button", { name }).click();
}

async function save(page: Page) {
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
}

test.beforeEach(async ({ page }, testInfo) => {
  await signInNewUser(page, emailFor(testInfo));
  await createProjects(emailFor(testInfo), ["Đồ án"]);
  await page.goto("/tasks/new");
  await expect(page.getByRole("button", { name: "Create Task" })).toBeEnabled();
  await page.getByLabel("Task name").fill("Viết chương ba");
  await page.getByRole("button", { name: "Create Task" }).click();
  await expect(page).toHaveURL("/tasks");
  await page.getByRole("link", { name: /Viết chương ba/ }).click();
  await expect(page.getByRole("heading", { name: "Viết chương ba" })).toBeVisible();
});

test.afterEach(async ({}, testInfo) => {
  await deleteUser(emailFor(testInfo));
});

test("each field saves on its own and survives a reload", async ({ page }, testInfo) => {
  test.slow();

  await edit(page, /Edit title/);
  await page.getByRole("dialog").getByLabel("Title").fill("Viết chương bốn");
  await save(page);

  await edit(page, /Edit description/);
  await page.getByRole("dialog").getByLabel("Description").fill("Phần thực nghiệm");
  await save(page);

  await edit(page, /^Priority/);
  await page.getByRole("dialog").getByLabel("Priority").selectOption("urgent");
  await save(page);

  await edit(page, /^Category/);
  await page.getByRole("checkbox", { name: "Research" }).check();
  await save(page);

  await edit(page, /^Project/);
  await page.getByRole("dialog").getByLabel("Project").selectOption({ label: "Đồ án" });
  await save(page);

  await edit(page, /^Deadline/);
  await page.getByRole("dialog").getByLabel("Due date").fill("2026-11-06");
  await page.getByRole("dialog").getByLabel("Time").fill("17:00");
  await save(page);

  await edit(page, /^Estimate/);
  await page.getByRole("dialog").getByLabel("Minutes").fill("90");
  await save(page);

  await edit(page, /^Status/);
  await page.getByRole("dialog").getByLabel("Status").selectOption("in_process");
  await save(page);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Viết chương bốn" })).toBeVisible();
  await expect(page.getByText("Phần thực nghiệm")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Priority/ })).toContainText("Urgent");
  await expect(page.getByRole("button", { name: /^Category/ })).toContainText("Research");
  await expect(page.getByRole("button", { name: /^Project/ })).toContainText("Đồ án");
  await expect(page.getByRole("button", { name: /^Deadline/ })).toContainText("Fri, Nov 6, 17:00");
  await expect(page.getByRole("button", { name: /^Estimate/ })).toContainText("1h 30m");
  await expect(page.getByRole("button", { name: /^Status/ })).toContainText("In process");
  await expect(page.getByText("K0-1")).toBeVisible();

  const [task] = await tasksOf(emailFor(testInfo));
  expect(task).toMatchObject({ title: "Viết chương bốn", priority: "urgent", status: "in_process", estimateMin: 90 });
  expect(task.dueAt?.toISOString()).toBe("2026-11-06T10:00:00.000Z");
});

test("a blank title is refused and nothing changes", async ({ page }, testInfo) => {
  await edit(page, /Edit title/);
  await page.getByRole("dialog").getByLabel("Title").fill("   ");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Enter a task name.");
  expect((await tasksOf(emailFor(testInfo)))[0].title).toBe("Viết chương ba");
});

test("a failed save keeps the sheet open and says so", async ({ page }) => {
  await edit(page, /Edit title/);
  await page.route(/\/tasks\//, (route) => (route.request().method() === "POST" ? route.abort() : route.continue()));
  await page.getByRole("dialog").getByLabel("Title").fill("Mất mạng");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Could not reach Flowday");
  await expect(page.getByRole("dialog").getByLabel("Title")).toHaveValue("Mất mạng");
});

test("canceling moves the task to Canceled and restoring brings it back", async ({ page }, testInfo) => {
  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("button", { name: "Cancel task" }).click();
  await expect(page.getByRole("button", { name: /^Status/ })).toContainText("Canceled");
  expect((await tasksOf(emailFor(testInfo)))[0].status).toBe("canceled");

  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("button", { name: "Restore task" }).click();
  await expect(page.getByRole("button", { name: /^Status/ })).toContainText("On going");
  expect((await tasksOf(emailFor(testInfo)))[0].status).toBe("ongoing");
});

test("deleting needs a confirmation and returns to the board", async ({ page }, testInfo) => {
  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("button", { name: "Delete task" }).click();
  await page.getByRole("button", { name: "Keep task" }).click();
  expect(await tasksOf(emailFor(testInfo))).toHaveLength(1);

  await page.getByRole("button", { name: "Delete task" }).click();
  await page.getByRole("button", { name: "Delete forever" }).click();

  await expect(page).toHaveURL("/tasks");
  await expect(page.getByRole("link", { name: /Viết chương ba/ })).toHaveCount(0);
  expect(await tasksOf(emailFor(testInfo))).toHaveLength(0);
});

test("the back link returns to the board", async ({ page }) => {
  await page.getByRole("link", { name: "Back to tasks" }).click();

  await expect(page).toHaveURL("/tasks");
});

test("an unknown task is a 404", async ({ page }) => {
  const response = await page.goto("/tasks/not-a-real-id");

  await expect(page.getByText(/could not be found/i)).toBeVisible();
  expect(response?.status()).toBeLessThan(500);
});

for (const width of [360, 390, 820, 1440]) {
  test(`no horizontal scroll at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });

    await expect(page.getByRole("heading", { name: "Viết chương ba" })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
}
