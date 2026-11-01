import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

// CI provides DATABASE_URL directly and has no .env file.
if (existsSync(".env")) process.loadEnvFile();

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ["src/**/*.test.ts"],
    // Neon suspends after 5 idle minutes, so the first query may wait for a cold start.
    testTimeout: 15_000,
  },
});
