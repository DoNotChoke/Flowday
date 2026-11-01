import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUserId } from "@/lib/auth/session";
import { getTask } from "@/services/tasks";

async function TaskTitle({ params }: PageProps<"/tasks/[id]">) {
  const userId = await requireUserId();
  const { id } = await params;
  const task = await getTask(userId, id);
  if (!task) notFound();

  return <h1 className="font-content text-3xl font-bold">{task.title}</h1>;
}

// shortcut: only the title until T2.7 builds the task detail page.
export default function TaskPage(props: PageProps<"/tasks/[id]">) {
  return (
    <Suspense>
      <TaskTitle {...props} />
    </Suspense>
  );
}
