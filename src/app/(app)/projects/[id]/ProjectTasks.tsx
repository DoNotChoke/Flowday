import Link from "next/link";
import { columns } from "@/components/app/board/columns";
import { priorities, type Card } from "@/components/app/board/TaskCard";
import { estimateLabel } from "@/lib/progress";

const statusTones: Record<Card["status"], string> = {
  ongoing: "bg-blue-tint",
  in_process: "bg-sun-tint",
  completed: "bg-teal-tint",
  canceled: "bg-coral-tint",
};

type ProjectTasksProps = { projectId: string; projectName: string; tasks: Card[]; status?: Card["status"] };

export function ProjectTasks({ projectId, projectName, tasks, status }: ProjectTasksProps) {
  const shown = status ? tasks.filter((task) => task.status === status) : tasks;
  const filters = [{ value: undefined, name: "All", count: tasks.length }, ...columns.map(({ status: value, name }) => ({ value, name, count: tasks.filter((task) => task.status === value).length }))];

  return (
    <section aria-labelledby="project-tasks" className="flex min-w-0 flex-col gap-3.5 rounded-[22px] border-hard bg-white p-5.5 shadow-hard-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2 id="project-tasks" className="text-[17px] font-semibold">
          Project tasks
        </h2>
        <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1.5">
          {filters.map(({ value, name, count }) => (
            <Link
              key={name}
              href={value ? `/projects/${projectId}?status=${value}` : `/projects/${projectId}`}
              aria-current={value === status ? "true" : undefined}
              className={`flex h-8.5 items-center gap-1.5 rounded-full border-hard px-3 text-xs font-medium pointer-coarse:min-h-11 ${value === status ? "bg-ink text-white" : "bg-white"}`}
            >
              {name} <span className="opacity-75">{count}</span>
            </Link>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl border-[1.5px] border-dashed border-[#9c9c96] p-5 text-center text-[13px] text-muted">No tasks here</p>
      ) : (
        <table className="w-full border-separate border-spacing-y-2 text-[13px] max-md:block">
          <thead className="text-left text-xs text-muted max-md:hidden">
            <tr>
              {["Task", "Priority", "Estimate", "Due", "Status"].map((heading) => (
                <th key={heading} scope="col" className="px-2.5 font-medium">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="max-md:flex max-md:flex-col max-md:gap-2">
            {shown.map((task) => (
              <tr key={task.id} className="bg-[#f7f7f4] max-md:flex max-md:flex-wrap max-md:items-center max-md:gap-x-3 max-md:gap-y-1.5 max-md:rounded-xl max-md:p-3">
                <td className="rounded-l-xl px-2.5 py-3 max-md:w-full max-md:p-0">
                  <Link href={`/tasks/${task.id}`} className={`font-content font-semibold break-words ${task.status === "canceled" ? "line-through" : ""}`}>
                    {task.code && <span className="mr-1.5 font-sans font-medium text-muted">{task.code}</span>}
                    {task.title}
                  </Link>
                </td>
                <td className="px-2.5 py-3 max-md:p-0">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                    <span style={{ backgroundColor: priorities[task.priority].dot }} className="size-2 rounded-full" />
                    {priorities[task.priority].label}
                  </span>
                </td>
                <td className={`px-2.5 py-3 whitespace-nowrap max-md:p-0 ${task.estimateMin ? "" : "max-md:hidden"}`}>{task.estimateMin ? estimateLabel(task.estimateMin) : "—"}</td>
                <td className={`px-2.5 py-3 whitespace-nowrap max-md:p-0 ${task.overdue ? "font-semibold text-danger" : ""} ${task.dueLabel ? "" : "max-md:hidden"}`}>{task.dueLabel ?? "—"}</td>
                <td className="rounded-r-xl px-2.5 py-3 max-md:p-0">
                  <span className={`rounded-lg border border-ink px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${statusTones[task.status]}`}>{columns.find((column) => column.status === task.status)?.name}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Link href={`/tasks/new?project=${projectId}`} className="flex h-11.5 items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-ink text-[13px] font-medium">
        + Add task to <span className="min-w-0 truncate font-content">{projectName}</span>
      </Link>
    </section>
  );
}
