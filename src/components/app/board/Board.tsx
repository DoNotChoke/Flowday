"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardCode,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDndContext,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { moveTaskAction } from "@/app/(app)/tasks/actions";
import { Chip } from "@/components/ui/Chip";
import type { getBoard } from "@/services/board";
import { columns } from "./columns";
import { MoveButton, MoveSheet } from "./MoveMenu";
import { TaskCard, type Card } from "./TaskCard";
import { TaskList } from "./TaskList";

export function StatusCards({ stats }: { stats: Awaited<ReturnType<typeof getBoard>>["stats"] }) {
  return (
    <section aria-label="Task status" className="grid grid-cols-1 gap-4.5 md:grid-cols-2 xl:grid-cols-4">
      {columns.map((column) => (
        <div key={column.status} className={`flex items-center gap-3.5 rounded-[20px] border-hard p-4.5 shadow-hard-5 ${column.tone}`}>
          <span className="flex size-12 flex-none items-center justify-center rounded-full border-[1.5px] border-ink/25 bg-white/40">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={column.icon} />
            </svg>
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-semibold">{column.name}</span>
            <span className="text-[13px]">{stats[column.status].count} Tasks</span>
          </span>
          <span className="rounded-full bg-white/55 px-2.5 py-1 text-xs font-semibold">{stats[column.status].delta}</span>
        </div>
      ))}
    </section>
  );
}

type Column = (typeof columns)[number];

function columnName(status: unknown) {
  return columns.find((column) => column.status === status)?.name;
}

function SortableCard({ card, color, onMove }: { card: Card; color: string; onMove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });

  return (
    <div className="flex flex-col gap-1.5">
      <TaskCard
        card={card}
        color={color}
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        // The card stays a link: Enter opens it and Space picks it up.
        role={undefined}
        aria-roledescription="draggable task"
        style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, transition, opacity: isDragging ? 0.4 : undefined }}
      />
      <div className="hidden pointer-coarse:grid">
        <MoveButton card={card} onClick={onMove} />
      </div>
    </div>
  );
}

function BoardColumn({ column, cards, shown, onMove }: { column: Column; cards: Card[]; shown: boolean; onMove: (card: Card) => void }) {
  const { setNodeRef } = useDroppable({ id: column.status });
  const { over } = useDndContext();
  const headingId = `column-${column.status}`;
  const highlighted = over?.id === column.status || over?.data.current?.sortable?.containerId === column.status;

  return (
    <section ref={setNodeRef} aria-labelledby={headingId} className={`min-w-0 flex-col gap-3.5 rounded-[22px] bg-panel p-3.5 md:flex ${shown ? "flex" : "hidden"} ${highlighted ? "outline-2 outline-ink" : ""}`}>
      <div className="flex items-center gap-2.5 px-1 py-0.5">
        <span style={{ backgroundColor: column.color }} className="size-3 rounded border-hard" />
        <h2 id={headingId} className="flex-1 text-[15px] font-semibold">
          {column.name}
        </h2>
        <span className="rounded-full border border-ink bg-white px-2.25 py-px text-xs font-semibold">{cards.length}</span>
        <Link href="/tasks/new" aria-label={`Add task to ${column.name}`} className="flex size-8 items-center justify-center rounded-[9px] pointer-coarse:size-11">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
      </div>
      <SortableContext id={column.status} items={cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
        {cards.map((card) => (
          <SortableCard key={card.id} card={card} color={column.color} onMove={() => onMove(card)} />
        ))}
      </SortableContext>
      {cards.length === 0 && <p className="rounded-2xl border-[1.5px] border-dashed border-[#9c9c96] p-5 text-center text-[13px] text-muted">No tasks here</p>}
    </section>
  );
}

export function Board({ tasks, view }: { tasks: Card[]; view: "board" | "list" }) {
  const [cards, showCards] = useOptimistic(tasks);
  const [, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<Card["status"]>("ongoing");
  const [moving, setMoving] = useState<Card | null>(null);
  const [error, setError] = useState("");
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: [KeyboardCode.Space], cancel: [KeyboardCode.Esc], end: [KeyboardCode.Space, KeyboardCode.Enter] },
    }),
  );

  const titleOf = (id: unknown) => cards.find((card) => card.id === id)?.title;
  const statusOf = (id: unknown) => cards.find((card) => card.id === id)?.status ?? id;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${titleOf(active.id)} is over ${columnName(statusOf(over.id))}.` : undefined),
    onDragEnd: ({ active, over }) => (over ? `${titleOf(active.id)} dropped in ${columnName(statusOf(over.id))}.` : undefined),
    onDragCancel: ({ active }) => `Move of ${titleOf(active.id)} canceled.`,
  };

  function drop({ active, over }: DragEndEvent) {
    setActiveId(null);
    const card = cards.find((option) => option.id === active.id);
    if (!card || !over || over.id === active.id) return;

    const target = cards.find((option) => option.id === over.id);
    const status = (target?.status ?? over.id) as Card["status"];
    const others = cards.filter((option) => option.status === status && option.id !== card.id).map((option) => option.id);

    let index = others.length;
    if (target) {
      const moved = active.rect.current.translated;
      const lands = target.status === card.status
        ? cards.indexOf(card) < cards.indexOf(target)
        : Boolean(moved) && moved!.top + moved!.height / 2 > over.rect.top + over.rect.height / 2;
      index = others.indexOf(target.id) + (lands ? 1 : 0);
    }
    move(card, status, others[index - 1] ?? null);
  }

  function move(card: Card, status: Card["status"], afterId: string | null) {
    const rest = cards.filter((option) => option.id !== card.id);
    const at = afterId ? rest.findIndex((option) => option.id === afterId) + 1 : 0;

    setError("");
    startTransition(async () => {
      showCards([...rest.slice(0, at), { ...card, status }, ...rest.slice(at)]);
      try {
        await moveTaskAction(card.id, { status, afterId });
      } catch (failure) {
        unstable_rethrow(failure);
        setError(`Could not move ${card.title}. It is back where it was.`);
      }
    });
  }

  function moveToEnd(card: Card, status: Card["status"]) {
    setMoving(null);
    move(card, status, cards.findLast((option) => option.status === status)?.id ?? null);
  }

  const activeCard = cards.find((card) => card.id === activeId);
  const alert = error && (
    <p role="alert" className="rounded-control border-hard bg-coral-tint px-4 py-3 text-sm font-medium">
      {error}
    </p>
  );
  const sheet = <MoveSheet card={moving} onClose={() => setMoving(null)} onMove={moveToEnd} />;

  if (view === "list") {
    return (
      <>
        {alert}
        <TaskList cards={cards} onMove={setMoving} />
        {sheet}
      </>
    );
  }

  return (
    <DndContext
      id="board"
      sensors={sensors}
      collisionDetection={closestCorners}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: "Press Space to pick up the task, use the arrow keys to move it, Space to drop it and Escape to cancel." },
      }}
      onDragStart={({ active }) => setActiveId(String(active.id))}
      onDragEnd={drop}
      onDragCancel={() => setActiveId(null)}
    >
      {alert}
      <div role="group" aria-label="Status" className="flex flex-wrap gap-2 md:hidden">
        {columns.map((column) => (
          <Chip key={column.status} pressed={tab === column.status} onClick={() => setTab(column.status)}>
            {column.name} {cards.filter((card) => card.status === column.status).length}
          </Chip>
        ))}
      </div>
      <section aria-label="Board" className="grid items-start gap-4.5 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((column) => (
          <BoardColumn key={column.status} column={column} cards={cards.filter((task) => task.status === column.status)} shown={tab === column.status} onMove={setMoving} />
        ))}
      </section>
      {/* No drop animation: the optimistic card is already in place when the overlay leaves. */}
      <DragOverlay dropAnimation={null}>
        {activeCard && <TaskCard card={activeCard} color={columns.find((column) => column.status === activeCard.status)!.color} aria-hidden tabIndex={-1} />}
      </DragOverlay>
      {sheet}
    </DndContext>
  );
}
