import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// CI provides these variables directly and has no .env file.
if (existsSync(".env")) process.loadEnvFile();

const baseURL = "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  // next dev compiles a route on its first hit, so a cold sign-up can outlast the default 5s.
  expect: { timeout: 15_000 },
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["list"], ["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 15"],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: {
    // CI runs the build from npm run check: next dev stalls on cold compiles and made e2e flaky.
    command: process.env.CI ? "npm start" : "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
