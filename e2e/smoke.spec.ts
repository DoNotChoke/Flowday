import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll } from "./helpers";

test("home page shows Flowday without horizontal scroll", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Flowday");
  await expect(page.getByRole("heading", { name: "Flowday" })).toBeVisible();
  await expectNoHorizontalScroll(page);
});
