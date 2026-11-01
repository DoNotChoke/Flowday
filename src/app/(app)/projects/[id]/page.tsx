import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUserId } from "@/lib/auth/session";
import { getProject } from "@/services/projects";

async function ProjectTitle({ params }: PageProps<"/projects/[id]">) {
  const [userId, { id }] = await Promise.all([requireUserId(), params]);
  const project = await getProject(userId, id);
  if (!project) notFound();

  return <h1 className="font-content text-3xl font-bold">{project.name}</h1>;
}

// shortcut: only the title until T4.1 builds the project overview.
export default function ProjectPage(props: PageProps<"/projects/[id]">) {
  return (
    <Suspense>
      <ProjectTitle {...props} />
    </Suspense>
  );
}
