import { expect, type Page } from "@playwright/test";

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => {
    const { scrollWidth, clientWidth } = document.documentElement;
    return scrollWidth - clientWidth;
  });
  expect(overflow, "page scrolls horizontally").toBeLessThanOrEqual(0);
}
