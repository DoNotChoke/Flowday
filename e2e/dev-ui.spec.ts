import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/dev/ui");
});

test("uses the Flowday page colors and Poppins", async ({ page }) => {
  const body = page.locator("body");

  await expect(body).toHaveCSS("background-color", "rgb(243, 243, 241)");
  await expect(body).toHaveCSS("color", "rgb(21, 21, 21)");
  await expect(body).toHaveCSS("font-family", /^["'_]*Poppins/);
  await expectNoHorizontalScroll(page);
});

test("md breakpoint starts at 744px", async ({ page }) => {
  const marker = page.getByTestId("md-marker");

  await page.setViewportSize({ width: 743, height: 900 });
  await expect(marker).toBeHidden();

  await page.setViewportSize({ width: 744, height: 900 });
  await expect(marker).toBeVisible();
});

test("renders Vietnamese with the web fonts, never a system font", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "platform font reporting needs the Chromium DevTools protocol");

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument");
  const { nodeId } = await cdp.send("DOM.querySelector", {
    nodeId: root.nodeId,
    selector: '[data-testid="vietnamese"]',
  });

  await expect
    .poll(async () => {
      const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
      return fonts.map((font) => ({ family: font.familyName, custom: font.isCustomFont }));
    })
    .toEqual(
      expect.arrayContaining([
        { family: "Poppins", custom: true },
        { family: "Be Vietnam Pro", custom: true },
      ]),
    );

  const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
  expect(fonts.filter((font) => !font.isCustomFont)).toEqual([]);
});
