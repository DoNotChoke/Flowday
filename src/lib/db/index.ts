import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");

function createPool() {
  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 10_000 });
  // Neon drops idle connections when it suspends; an unhandled pool error would kill the process.
  pool.on("error", (error) => console.error("Postgres pool error:", error.message));
  return pool;
}

// next dev re-evaluates this module on every edit; one shared pool stops connections leaking.
const globalForDb = globalThis as typeof globalThis & { flowdayPool?: Pool };
const pool = (globalForDb.flowdayPool ??= createPool());

export const db = drizzle(pool);
