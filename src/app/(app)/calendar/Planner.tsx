"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardCode,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { unstable_rethrow } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import type { CalendarItem, UnscheduledTask } from "@/services/calendar";
import { updateTaskAction } from "../tasks/[id]/actions";
import { Agenda } from "./Agenda";
import { MonthGrid } from "./MonthGrid";
import { Unscheduled } from "./Unscheduled";

type PlannerProps = { days: string[]; today: string; selected: string; items: CalendarItem[]; unscheduled: UnscheduledTask[] };

const dayName = (day: unknown) => new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" }).format(Date.parse(String(day)));

export function Planner({ days, today, selected, items, unscheduled }: PlannerProps) {
  const [shown, showPlanned] = useOptimistic({ items, unscheduled }, (current, { task, day }: { task: UnscheduledTask; day: string }) => ({
    items: [{ ...task, day, kind: "planned" as const, time: null }, ...current.items],
    unscheduled: current.unscheduled.filter((option) => option.id !== task.id),
  }));
  const [, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: [KeyboardCode.Space], cancel: [KeyboardCode.Esc], end: [KeyboardCode.Space, KeyboardCode.Enter] },
    }),
  );

  const byDay = new Map<string, CalendarItem[]>();
  for (const item of shown.items) byDay.set(item.day, [...(byDay.get(item.day) ?? []), item]);

  const titleOf = (id: unknown) => shown.unscheduled.find((task) => task.id === id)?.title;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${titleOf(active.id)} is over ${dayName(over.id)}.` : undefined),
    onDragEnd: ({ active, over }) => (over ? `${titleOf(active.id)} planned for ${dayName(over.id)}.` : undefined),
    onDragCancel: ({ active }) => `${titleOf(active.id)} was not planned.`,
  };

  function plan(task: UnscheduledTask, day: string) {
    setError("");
    startTransition(async () => {
      showPlanned({ task, day });
      const failed = await updateTaskAction(task.id, { plannedDate: day }).then(
        (result) => Boolean(result),
        (failure) => {
          unstable_rethrow(failure);
          return true;
        },
      );
      if (failed) setError(`Could not plan ${task.title}. It is back in Unscheduled.`);
    });
  }

  function drop({ active, over }: DragEndEvent) {
    setActiveId(null);
    const task = shown.unscheduled.find((option) => option.id === active.id);
    if (task && over) plan(task, String(over.id));
  }

  const activeTask = shown.unscheduled.find((task) => task.id === activeId);

  return (
    <DndContext
      id="calendar"
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: "Press Space to pick up the task, use the arrow keys to move it to a day, Space to plan it and Escape to cancel." },
      }}
      onDragStart={({ active }) => setActiveId(String(active.id))}
      onDragEnd={drop}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex flex-wrap items-start gap-6">
        <MonthGrid days={days} month={selected.slice(0, 7)} today={today} selected={selected} byDay={byDay} />
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-4.5">
          <Agenda date={selected} today={today} items={byDay.get(selected) ?? []} />
          {error && (
            <p role="alert" className="rounded-control border-hard bg-coral-tint px-4 py-3 text-sm font-medium">
              {error}
            </p>
          )}
          <Unscheduled tasks={shown.unscheduled} selected={selected} onPlan={plan} />
        </div>
      </div>
      {/* No drop animation: the planned chip is already on its day when the overlay leaves. */}
      <DragOverlay dropAnimation={null}>
        {activeTask && <span className="block rounded-[10px] border-hard bg-white px-3 py-2 font-content text-[13px] shadow-hard-3">{activeTask.title}</span>}
      </DragOverlay>
    </DndContext>
  );
}
