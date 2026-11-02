import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Board, StatusCards } from "@/components/app/board/Board";
import { SearchBox } from "@/components/app/board/SearchBox";
import { requireUserId } from "@/lib/auth/session";
import { getBoard, type BoardFilter } from "@/services/board";
import { listCategories } from "@/services/categories";

export const metadata: Metadata = { title: "Flowday — My tasks" };

const sorts = [
  { value: "manual", label: "Manual" },
  { value: "priority", label: "Priority" },
  { value: "due", label: "Due date" },
] as const;

const views = [
  { value: "board", label: "Board" },
  { value: "list", label: "List" },
] as const;

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

async function Content({ searchParams }: PageProps<"/tasks">) {
  const userId = await requireUserId();
  const query = await searchParams;
  const category = single(query.category);
  const project = single(query.project);
  const sort = sorts.find((option) => option.value === query.sort)?.value ?? "manual";
  const view = views.find((option) => option.value === query.view)?.value ?? "board";
  const filter: BoardFilter = { categoryId: category, projectId: project, sort };
  const [board, categories] = await Promise.all([getBoard(userId, filter), listCategories(userId)]);

  function href(change: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ category, project, sort, view, ...change })) {
      if (value && value !== "manual" && value !== "board") params.set(key, value);
    }
    const search = params.toString();
    return search ? `/tasks?${search}` : "/tasks";
  }

  const chipClass = (on: boolean) =>
    `flex h-9.5 max-w-full items-center truncate rounded-full border-hard px-4 text-[13px] font-medium pointer-coarse:min-h-11 ${on ? "bg-ink text-white" : "bg-white"}`;

  const segmentClass = (on: boolean) => `flex h-8.5 items-center rounded-[9px] px-3 text-[13px] pointer-coarse:min-h-11 ${on ? "bg-sun-tint font-semibold" : ""}`;

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="font-content text-3xl font-bold tracking-[-0.6px]">Hi, {board.name}</h1>
          <p className="text-sm text-muted">
            {board.dateLabel} · {board.dueToday} {board.dueToday === 1 ? "task" : "tasks"} due today
          </p>
        </div>
        <SearchBox />
      </header>

      <StatusCards stats={board.stats} />

      <section className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filter by category" className="flex min-w-0 flex-wrap gap-2">
          <Link href={href({ category: undefined })} aria-current={category ? undefined : "true"} className={chipClass(!category)}>
            All
          </Link>
          {categories.map((option) => (
            <Link key={option.id} href={href({ category: option.id })} aria-current={category === option.id ? "true" : undefined} className={`${chipClass(category === option.id)} font-content`}>
              {option.name}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="View" className="flex items-center gap-1 rounded-xl border-hard bg-white p-0.75">
            {views.map((option) => (
              <Link key={option.value} href={href({ view: option.value })} aria-current={view === option.value ? "true" : undefined} className={segmentClass(view === option.value)}>
                {option.label}
              </Link>
            ))}
          </div>
          <div role="group" aria-label="Sort" className="flex items-center gap-1 rounded-xl border-hard bg-white p-0.75">
            {sorts.map((option) => (
              <Link key={option.value} href={href({ sort: option.value })} aria-current={sort === option.value ? "true" : undefined} className={segmentClass(sort === option.value)}>
                {option.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Board tasks={board.tasks} view={view} />
    </>
  );
}

function Skeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-6 motion-reduce:animate-none">
      <div className="h-16 w-64 rounded-control bg-panel" />
      <div className="grid gap-4.5 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="h-22 rounded-[20px] bg-panel" />
        ))}
      </div>
      <div className="h-96 rounded-[22px] bg-panel" />
    </div>
  );
}

export default function TasksPage(props: PageProps<"/tasks">) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Content {...props} />
    </Suspense>
  );
}
