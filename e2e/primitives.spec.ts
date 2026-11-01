import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/dev/ui");
});

test("every control is at least 44px tall on touch screens", async ({ page, isMobile }) => {
  test.skip(!isMobile, "touch targets only grow on coarse pointers");

  const controls = await page.locator("main").locator("button:visible, a:visible").evaluateAll((elements) =>
    elements.map((element) => ({
      name: element.textContent,
      height: element.getBoundingClientRect().height,
    })),
  );

  expect(controls.length).toBeGreaterThan(0);
  expect(controls.filter((control) => control.height < 44)).toEqual([]);
});

test("controls keep their design size with a mouse", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop sizes come from the design");

  await expect(page.getByRole("button", { name: "Small action" })).toHaveCSS("height", "40px");
  await expect(page.getByRole("button", { name: "Design" })).toHaveCSS("height", "38px");
});

test("primary button uses the coral fill and hard shadow", async ({ page }) => {
  const button = page.getByRole("button", { name: "Primary action" });

  await expect(button).toHaveCSS("background-color", "rgb(244, 114, 88)");
  await expect(button).toHaveCSS("box-shadow", /rgb\(21, 21, 21\) 0px 4px 0px/);
});

test("white buttons use a lighter weight than filled ones", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Outline action" })).toHaveCSS("font-weight", "500");
  await expect(page.getByRole("button", { name: "Dark action" })).toHaveCSS("font-weight", "600");
});

test("keyboard focus shows an outline on every control", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard navigation is a desktop concern");

  const controls = page.locator("main").locator("button:enabled:visible, a:visible, input:visible, textarea:visible, select:visible");
  const count = await controls.count();
  expect(count).toBeGreaterThan(0);

  for (let index = 0; index < count; index += 1) {
    await page.keyboard.press("Tab");
    await expect(controls.nth(index)).toBeFocused();
    await expect(controls.nth(index)).toHaveCSS("outline-style", "solid");
    await expect(controls.nth(index)).toHaveCSS("outline-width", "2px");
  }
});

test("clicking a text field colours its own border instead of adding a ring", async ({ page }) => {
  const field = page.locator("main input:not([type=checkbox]):not([type=radio]):visible").first();
  await field.click();

  await expect(field).toHaveCSS("outline-offset", /^-/);
  await expect(field).toHaveCSS("outline-color", "rgb(244, 114, 88)");
});

test("disabled button cannot be used", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Disabled action" })).toBeDisabled();
});

test("button with href renders a link", async ({ page }) => {
  await expect(page.getByRole("link", { name: "Link action" })).toHaveAttribute("href", "/");
});

test("chip toggles its pressed state", async ({ page }) => {
  const chip = page.getByRole("button", { name: "Design" });
  await expect(chip).toHaveAttribute("aria-pressed", "true");

  await chip.click();

  await expect(chip).toHaveAttribute("aria-pressed", "false");
});

test("segmented control marks only the chosen option", async ({ page }) => {
  const view = page.getByRole("group", { name: "View" });
  const board = view.getByRole("button", { name: "Board" });
  const list = view.getByRole("button", { name: "List" });
  await expect(board).toHaveAttribute("aria-pressed", "true");

  await list.click();

  await expect(list).toHaveAttribute("aria-pressed", "true");
  await expect(board).toHaveAttribute("aria-pressed", "false");
});

test("clicking a field label focuses its input", async ({ page }) => {
  await page.locator("label", { hasText: "Email" }).click();

  await expect(page.getByLabel("Email")).toBeFocused();
});

test("field describes itself with its hint", async ({ page }) => {
  await expect(page.getByLabel("Email")).toHaveAccessibleDescription("We never share your email.");
  await expect(page.getByLabel("Email")).not.toHaveAttribute("aria-invalid", "true");
});

test("invalid field exposes its error to assistive tech", async ({ page }) => {
  const password = page.getByLabel("Password");

  await expect(password).toHaveAttribute("aria-invalid", "true");
  await expect(password).toHaveAccessibleDescription("Use at least 8 characters.");
});

test("textarea and select fields are labelled", async ({ page }) => {
  await expect(page.getByLabel("Description").evaluate((el) => el.tagName)).resolves.toBe("TEXTAREA");
  await expect(page.getByLabel("Status").evaluate((el) => el.tagName)).resolves.toBe("SELECT");
});

test("form controls use at least 16px text on touch screens", async ({ page, isMobile }) => {
  test.skip(!isMobile, "iOS only zooms into small inputs on touch devices");

  const sizes = await page.locator("main").locator("input, textarea, select").evaluateAll((elements) =>
    elements.map((element) => parseFloat(getComputedStyle(element).fontSize)),
  );

  expect(sizes.length).toBeGreaterThan(0);
  expect(sizes.filter((size) => size < 16)).toEqual([]);
});

test("switch toggles with the space key", async ({ page }) => {
  const toggle = page.getByRole("switch", { name: "Get alert" });
  await expect(toggle).toHaveAttribute("aria-checked", "true");

  await toggle.focus();
  await page.keyboard.press("Space");

  await expect(toggle).toHaveAttribute("aria-checked", "false");
});

test("sheet closes with Escape and returns focus to its trigger", async ({ page }) => {
  const trigger = page.getByRole("button", { name: "Open sheet" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Sheet title" })).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("sheet closes with its close button", async ({ page }) => {
  await page.getByRole("button", { name: "Open sheet" }).click();

  await page.getByRole("button", { name: "Close" }).click();

  await expect(page.getByRole("dialog")).toBeHidden();
});

test("sheet stops the page behind it from scrolling", async ({ page }) => {
  const rootOverflow = () => page.evaluate(() => getComputedStyle(document.documentElement).overflowY);
  await page.getByRole("button", { name: "Open sheet" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await rootOverflow()).toBe("hidden");

  await page.keyboard.press("Escape");

  await expect(page.getByRole("dialog")).toBeHidden();
  expect(await rootOverflow()).not.toBe("hidden");
});

test("sheet sits at the bottom on phones", async ({ page, isMobile }) => {
  test.skip(!isMobile, "the sheet is centered from the md breakpoint");
  await page.getByRole("button", { name: "Open sheet" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const { height } = page.viewportSize()!;

  await expect.poll(async () => Math.round((await dialog.boundingBox())!.y + (await dialog.boundingBox())!.height)).toBe(height);
});

test("select drops the native look so it matches other fields", async ({ page }) => {
  const select = page.getByLabel("Status");

  await expect(select).toHaveCSS("appearance", "none");
  await expect(select).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(select).toHaveCSS("box-shadow", /rgb\(21, 21, 21\) 0px 3px 0px/);
});
