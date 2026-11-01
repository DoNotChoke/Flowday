import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/dev/ui");
});

test("every control is at least 44px tall on touch screens", async ({ page, isMobile }) => {
  test.skip(!isMobile, "touch targets only grow on coarse pointers");

  const controls = await page.locator("main").locator("button, a").evaluateAll((elements) =>
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

  const controls = page.locator("main").locator("button:enabled, a");
  const count = await controls.count();
  expect(count).toBeGreaterThan(0);

  for (let index = 0; index < count; index += 1) {
    await page.keyboard.press("Tab");
    await expect(controls.nth(index)).toBeFocused();
    await expect(controls.nth(index)).toHaveCSS("outline-style", "solid");
    await expect(controls.nth(index)).toHaveCSS("outline-width", "2px");
  }
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
