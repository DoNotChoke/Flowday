import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll } from "./helpers";

test("the home address leads a visitor to sign-in without horizontal scroll", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Flowday/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expectNoHorizontalScroll(page);
});
