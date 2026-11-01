import { expect, test, type TestInfo } from "@playwright/test";
import { createProjects, deleteUser, expectNoHorizontalScroll, expectNoUnreachableFlash, signInNewUser, tasksOf, watchForUnreachable } from "./helpers";

function emailFor(testInfo: TestInfo) {
  return `e2e-tasks-${testInfo.project.name}@flowday.test`;
}

test.beforeEach(async ({ page }, testInfo) => {
  await signInNewUser(page, emailFor(testInfo));
  await page.goto("/tasks/new");
  await expect(page.getByRole("button", { name: "Create Task" })).toBeEnabled();
});

test.afterEach(async ({}, testInfo) => {
  await deleteUser(emailFor(testInfo));
});

test("a task with every field is saved", async ({ page }, testInfo) => {
  await createProjects(emailFor(testInfo), ["Đồ án tốt nghiệp"]);
  await page.reload();
  await expect(page.getByRole("button", { name: "Create Task" })).toBeEnabled();

  await page.getByLabel("Task name").fill("Viết chương ba");
  await page.getByLabel("Description").fill("Phần thực nghiệm");
  await page.getByRole("button", { name: "Urgent" }).click();
  await page.getByRole("button", { name: "Research" }).click();
  await page.getByLabel("Project", { exact: true }).selectOption({ label: "Đồ án tốt nghiệp" });
  await page.getByRole("button", { name: "2h", exact: true }).click();
  await page.getByLabel("Status").selectOption({ label: "In process" });
  await page.getByLabel("Due date").fill("2026-11-06");
  await page.getByLabel("Time", { exact: true }).fill("17:00");
  await page.getByRole("button", { name: "Create Task" }).click();

  await expect(page).toHaveURL("/tasks");
  const [task] = await tasksOf(emailFor(testInfo));
  expect(task).toMatchObject({
    title: "Viết chương ba",
    description: "Phần thực nghiệm",
    priority: "urgent",
    status: "in_process",
    estimateMin: 120,
    number: 1,
  });
  expect(task.dueAt?.toISOString()).toBe("2026-11-06T10:00:00.000Z");
});

test("creating a task shows no connection error on the way to the board", async ({ page }) => {
  await watchForUnreachable(page);
  await page.getByLabel("Task name").fill("Không báo lỗi");
  await page.getByRole("button", { name: "Create Task" }).click();

  await expect(page).toHaveURL("/tasks");
  await expectNoUnreachableFlash(page);
});

test("a missing name is reported on the field and nothing is lost", async ({ page }) => {
  await page.getByLabel("Description").fill("Keep me");
  await page.getByLabel("Task name").fill("   ");
  await page.getByRole("button", { name: "Create Task" }).click();

  await expect(page.getByLabel("Task name")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Description")).toHaveValue("Keep me");
});

test("the estimate chips, the fields and the session count agree", async ({ page }) => {
  await page.getByRole("button", { name: "1 day", exact: true }).click();

  await expect(page.getByLabel("Hours")).toHaveValue("8");
  await expect(page.getByText("≈ 20 focus sessions")).toBeVisible();

  await page.getByLabel("Minutes").fill("30");
  await expect(page.getByRole("button", { name: "1 day", exact: true })).toHaveAttribute("aria-pressed", "false");
});

test("a new category is added and selected without leaving the form", async ({ page }) => {
  await page.getByLabel("Task name").fill("Keep me");

  await page.getByRole("button", { name: "+ New category" }).click();
  await page.getByLabel("Category name").fill("Học tập");
  await page.getByRole("button", { name: "Add" }).click();

  await expect(page.getByRole("button", { name: "Học tập" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Task name")).toHaveValue("Keep me");
});

test("a new project is created and selected without losing the form", async ({ page }) => {
  await page.getByLabel("Task name").fill("Keep me");

  await page.getByRole("button", { name: "+ New project" }).click();
  await page.getByLabel("Project name").fill("Dự án mới");
  await page.getByRole("button", { name: "Create project" }).click();

  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(/.+/);
  await expect(page.getByLabel("Task name")).toHaveValue("Keep me");
});

test("the project in the address is already selected", async ({ page }, testInfo) => {
  await createProjects(emailFor(testInfo), ["Preselected"]);
  await page.reload();
  const id = await page.getByRole("option", { name: "Preselected" }).getAttribute("value");

  await page.goto(`/tasks/new?project=${id}`);

  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(id!);
});

test("the preview follows the form", async ({ page }) => {
  await page.getByLabel("Task name").fill("Xem trước");
  await page.getByRole("button", { name: "High" }).click();

  const preview = page.getByRole("complementary");
  await expect(preview.getByText("Xem trước")).toBeVisible();
  await expect(preview.getByText("High")).toBeVisible();
});

for (const width of [360, 390, 820, 1440]) {
  test(`no horizontal scroll at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });

    await expect(page.getByRole("heading", { name: "Create a new task" })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
}

test.describe("the board", () => {
  test.beforeEach(async ({ page }) => {
    await page.getByLabel("Task name").fill("Viết chương ba");
    await page.getByRole("button", { name: "Research" }).click();
    await page.getByRole("button", { name: "Create Task" }).click();
    await expect(page).toHaveURL("/tasks");
  });

  test("a new task appears in its column with the greeting above", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Hi, Việt" })).toBeVisible();

    const column = page.getByRole("region", { name: "On going" });
    await expect(column.getByRole("link", { name: /Viết chương ba/ })).toBeVisible();
    await expect(column.getByText("1", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Task status" }).getByText("1 Tasks")).toBeVisible();
  });

  test("the filter stays in the address and survives a reload", async ({ page }) => {
    await page.getByRole("group", { name: "Filter by category" }).getByRole("link", { name: "Design" }).click();
    await expect(page).toHaveURL(/category=/);
    await expect(page.getByRole("link", { name: /Viết chương ba/ })).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole("link", { name: /Viết chương ba/ })).toHaveCount(0);

    await page.getByRole("group", { name: "Filter by category" }).getByRole("link", { name: "All" }).click();
    await expect(page.getByRole("link", { name: /Viết chương ba/ })).toBeVisible();
  });

  test("a card opens its task", async ({ page }) => {
    await page.getByRole("link", { name: /Viết chương ba/ }).click();

    await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: "Viết chương ba" })).toBeVisible();
  });

  test("the sidebar counts open tasks", async ({ page, isMobile }) => {
    test.skip(isMobile, "the sidebar starts at 1024 px");

    await expect(page.getByRole("link", { name: "My tasks" })).toContainText("1");
  });

  for (const width of [360, 390, 820, 1024, 1440]) {
    test(`no horizontal scroll at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });

      await expect(page.getByRole("heading", { name: "Hi, Việt" })).toBeVisible();
      await expectNoHorizontalScroll(page);
    });
  }
});
