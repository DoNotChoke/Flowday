type BurndownProps = {
  points: { day: string; remaining: number | null }[];
  ideal: { from: string; to: string; hours: number } | null;
  noEstimate: number;
};

const LEFT = 36;
const RIGHT = 630;
const TOP = 16;
const BOTTOM = 190;
const short = (day: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(Date.parse(day));

// Estimated hours left each day against a straight line from the start to the target, drawn as plain SVG.
export function Burndown({ points, ideal, noEstimate }: BurndownProps) {
  const done = points.filter((point) => point.remaining !== null);
  const highest = Math.max(ideal?.hours ?? 0, ...done.map((point) => point.remaining!));
  const top = Math.max(4, Math.ceil(highest / 4) * 4);
  const x = (day: string) => {
    const index = points.findIndex((point) => point.day === day);
    return LEFT + (points.length > 1 ? (index * (RIGHT - LEFT)) / (points.length - 1) : (RIGHT - LEFT) / 2);
  };
  const y = (hours: number) => BOTTOM - (hours / top) * (BOTTOM - TOP);
  const left = done.at(-1)?.remaining ?? 0;

  return (
    <section aria-label="Burndown" className="flex min-w-0 flex-col gap-3 rounded-card border-hard bg-white p-5.5 shadow-hard-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Burndown</h2>
        <div className="flex gap-3.5 text-xs text-muted">
          {ideal && (
            <span className="flex items-center gap-1.5">
              <span className="h-0 w-4 border-t-2 border-dashed border-[#9c9c96]" />
              Ideal
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-4 rounded-full bg-coral" />
            Remaining
          </span>
        </div>
      </div>

      {points.length ? (
        <>
          <svg viewBox="0 0 640 210" role="img" aria-label={`${Math.round(left * 10) / 10} estimated hours left${ideal ? `, aiming for none by ${short(ideal.to)}` : ""}.`} className="h-auto w-full">
            <g stroke="#ececec" strokeWidth="1">
              {[0, 1, 2, 3, 4].map((step) => (
                <line key={step} x1={LEFT} x2={RIGHT} y1={TOP + (step * (BOTTOM - TOP)) / 4} y2={TOP + (step * (BOTTOM - TOP)) / 4} />
              ))}
            </g>
            <g fontSize="10" fill="#5f5f5f">
              {[0, 1, 2, 3, 4].map((step) => (
                <text key={step} x="4" y={TOP + (step * (BOTTOM - TOP)) / 4 + 4}>
                  {(top * (4 - step)) / 4}h
                </text>
              ))}
            </g>
            {ideal && <line x1={x(ideal.from)} y1={y(ideal.hours)} x2={x(ideal.to)} y2={y(0)} stroke="#9c9c96" strokeWidth="2" strokeDasharray="6 6" />}
            <polyline points={done.map((point) => `${x(point.day)},${y(point.remaining!)}`).join(" ")} fill="none" stroke="#f47258" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div aria-hidden="true" className="flex justify-between pl-7 text-[11px] text-muted">
            <span>{short(points[0].day)}</span>
            <span>{short(points.at(-1)!.day)}</span>
          </div>
        </>
      ) : (
        <p className="text-[13px] text-muted">Add a task with an estimate to see the burndown.</p>
      )}
      {noEstimate > 0 && (
        <p className="text-xs text-muted">
          {noEstimate} {noEstimate === 1 ? "task has" : "tasks have"} no estimate and {noEstimate === 1 ? "is" : "are"} left out.
        </p>
      )}
    </section>
  );
}
