import { estimateLabel } from "@/lib/progress";
import type { QueueTask } from "@/services/focus";

type QueueProps = { tasks: QueueTask[]; current: string | null; locked: boolean; onPick: (task: QueueTask) => void };

export function Queue({ tasks, current, locked, onPick }: QueueProps) {
  const total = tasks.reduce((sum, task) => sum + (task.estimateMin ?? 0), 0);

  return (
    <section aria-label="Today's queue" className="flex flex-col gap-3 rounded-[22px] border-hard bg-white p-4.5 shadow-hard-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold">Today’s queue</h2>
        {total > 0 && <span className="text-xs text-muted">≈ {estimateLabel(total)}</span>}
      </div>
      {tasks.length ? (
        <ol className="flex flex-col gap-1.5">
          {tasks.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                disabled={locked}
                aria-pressed={task.id === current}
                onClick={() => onPick(task)}
                className={`flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[13px] disabled:cursor-not-allowed ${task.id === current ? "bg-sun-tint font-semibold" : "hover:bg-[#f7f7f4]"}`}
              >
                <span aria-hidden="true" className={`size-2 flex-none rounded-full ${task.id === current ? "bg-ink" : "bg-[#9c9c96]"}`} />
                <span className="min-w-0 flex-1 truncate font-content">{task.title}</span>
                <span className="flex-none text-xs text-muted tabular-nums" aria-label={`${task.done} of ${task.planned ?? "no"} planned sessions done`}>
                  {task.done}/{task.planned ?? "–"}
                </span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-[13px] text-muted">Nothing in process, planned or due today.</p>
      )}
      {locked && tasks.length > 0 && <p className="text-xs text-muted">Reset or finish the session to switch task.</p>}
    </section>
  );
}
