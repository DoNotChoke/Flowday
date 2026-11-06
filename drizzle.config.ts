import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// CI provides DATABASE_URL directly and has no .env file.
if (existsSync(".env")) process.loadEnvFile();

// Migrations take a direct connection when there is one; Neon advises against running them through the pooler.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
