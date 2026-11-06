import { requireUserId } from "@/lib/auth/session";
import { toCsv } from "@/lib/csv";
import { completedInRange, ranges, type Range } from "@/services/stats";

export async function GET(request: Request) {
  const userId = await requireUserId();
  const asked = new URL(request.url).searchParams.get("range");
  const range: Range = asked && asked in ranges ? (asked as Range) : "month";
  const rows = await completedInRange(userId, range);

  const csv = toCsv([
    ["Completed", "Code", "Title", "Project", "Categories", "Estimate (min)", "Focus (min)"],
    ...rows.map((row) => [row.completed, row.code, row.title, row.project, row.categories, row.estimateMin, row.focusMin]),
  ]);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="flowday-history-${range}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
