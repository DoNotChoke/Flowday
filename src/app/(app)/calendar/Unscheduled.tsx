"use client";

import { useDraggable } from "@dnd-kit/core";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { Sheet } from "@/components/ui/Sheet";
import { useHydrated } from "@/lib/useHydrated";
import type { UnscheduledTask } from "@/services/calendar";

type UnscheduledProps = { tasks: UnscheduledTask[]; selected: string; onPlan: (task: UnscheduledTask, day: string) => void };

function Row({ task, disabled, onPlan }: { task: UnscheduledTask; disabled: boolean; onPlan: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });

  return (
    <li className={`flex items-center gap-2 rounded-[10px] border-hard bg-white py-1 pr-1 pl-3 ${isDragging ? "opacity-40" : ""}`}>
      <span ref={setNodeRef} {...listeners} {...attributes} aria-label={`Drag ${task.title}`} className="min-w-0 flex-1 cursor-grab touch-manipulation truncate py-2 font-content text-[13px]">
        {task.title}
      </span>
      <button type="button" disabled={disabled} onClick={onPlan} aria-label={`Plan ${task.title}`} className="min-h-9 flex-none rounded-lg px-3 text-[13px] font-semibold hover:bg-teal-tint pointer-coarse:min-h-11">
        Plan
      </button>
    </li>
  );
}

export function Unscheduled({ tasks, selected, onPlan }: UnscheduledProps) {
  const hydrated = useHydrated();
  const [planning, setPlanning] = useState<UnscheduledTask | null>(null);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const day = String(new FormData(event.currentTarget).get("date"));
    if (!planning || !day) return;
    onPlan(planning, day);
    setPlanning(null);
  }

  return (
    <section aria-label="Unscheduled" className="flex flex-col gap-3 rounded-[22px] border-hard bg-teal-tint p-5">
      <h2 className="text-[15px] font-semibold">Unscheduled · {tasks.length}</h2>
      {tasks.length ? (
        <>
          <p className="text-xs text-[#2c4b4a]">Drag onto a day, or press Plan to pick one.</p>
          <ul className="flex flex-col gap-2">
            {tasks.map((task) => (
              <Row key={task.id} task={task} disabled={!hydrated} onPlan={() => setPlanning(task)} />
            ))}
          </ul>
        </>
      ) : (
        <p className="text-xs text-[#2c4b4a]">Every open task has a day.</p>
      )}

      <Sheet open={Boolean(planning)} onClose={() => setPlanning(null)} title={`Plan ${planning?.title ?? "task"}`}>
        {planning && (
          <form onSubmit={save}>
            <DateField label="Day" name="date" defaultValue={selected} />
            <Button type="submit" size="md" className="mt-5 w-full">
              Plan
            </Button>
          </form>
        )}
      </Sheet>
    </section>
  );
}
