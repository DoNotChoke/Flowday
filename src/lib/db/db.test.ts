import { sql } from "drizzle-orm";
import { afterAll, expect, test } from "vitest";
import { db } from "@/lib/db";

afterAll(() => db.$client.end());

test("unaccent strips Vietnamese diacritics through the db client", async () => {
  const { rows } = await db.execute(sql`select unaccent('Việt Đồ án') as value`);

  expect(rows[0].value).toBe("Viet Do an");
});
