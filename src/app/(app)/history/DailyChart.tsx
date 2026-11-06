type Point = { key: string; created: number; completed: number };

const LEFT = 32;
const RIGHT = 630;
const TOP = 20;
const BOTTOM = 200;

const label = (key: string, byMonth: boolean) =>
  new Intl.DateTimeFormat("en-US", byMonth ? { month: "short", timeZone: "UTC" } : { month: "short", day: "numeric", timeZone: "UTC" }).format(Date.parse(byMonth ? `${key}-01` : key));

// Two lines, tasks finished and tasks created, drawn as plain SVG like the design.
export function DailyChart({ points, period }: { points: Point[]; period: string }) {
  const byMonth = points[0]?.key.length === 7;
  // The top line is a multiple of 4 so the four gaps between grid lines are whole numbers.
  const top = Math.max(4, Math.ceil(Math.max(...points.flatMap((point) => [point.created, point.completed])) / 4) * 4);
  const x = (index: number) => LEFT + (points.length > 1 ? (index * (RIGHT - LEFT)) / (points.length - 1) : (RIGHT - LEFT) / 2);
  const y = (value: number) => BOTTOM - (value / top) * (BOTTOM - TOP);
  const line = (pick: (point: Point) => number) => points.map((point, index) => `${x(index)},${y(pick(point))}`).join(" ");
  const created = points.reduce((sum, point) => sum + point.created, 0);
  const completed = points.reduce((sum, point) => sum + point.completed, 0);
  const ticks = [...new Set([0, Math.round((points.length - 1) / 3), Math.round(((points.length - 1) * 2) / 3), points.length - 1])];
  const last = points.length - 1;

  return (
    <div className="flex flex-col gap-2">
      <svg viewBox="0 0 640 220" role="img" aria-label={`Over ${period}: ${created} ${created === 1 ? "task" : "tasks"} created, ${completed} completed.`} className="h-auto w-full">
        <g stroke="#ececec" strokeWidth="1">
          {[0, 1, 2, 3, 4].map((step) => (
            <line key={step} x1={LEFT} x2={RIGHT} y1={TOP + (step * (BOTTOM - TOP)) / 4} y2={TOP + (step * (BOTTOM - TOP)) / 4} />
          ))}
        </g>
        <g fontSize="10" fill="#5f5f5f">
          {[0, 1, 2, 3, 4].map((step) => (
            <text key={step} x="4" y={TOP + (step * (BOTTOM - TOP)) / 4 + 4}>
              {(top * (4 - step)) / 4}
            </text>
          ))}
        </g>
        <polyline points={line((point) => point.created)} fill="none" stroke="#e0a800" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={line((point) => point.completed)} fill="none" stroke="#3fb3ad" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={x(last)} cy={y(points[last]?.completed ?? 0)} r="6" fill="#ffffff" stroke="#151515" strokeWidth="2" />
      </svg>
      <div aria-hidden="true" className="flex justify-between pl-6 text-[11px] text-muted">
        {ticks.map((index) => (
          <span key={index}>{index === last && !byMonth ? "Today" : label(points[index].key, byMonth)}</span>
        ))}
      </div>
    </div>
  );
}
