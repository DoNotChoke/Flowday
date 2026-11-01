import { Suspense } from "react";
import { SignOutButton } from "@/components/app/SignOutButton";
import { getCurrentUser } from "@/lib/auth/session";

async function Account() {
  const user = await getCurrentUser();

  return (
    <>
      <p className="font-content">{user.name}</p>
      <SignOutButton />
    </>
  );
}

export default function TasksPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">My tasks</h1>
      <Suspense>
        <Account />
      </Suspense>
    </main>
  );
}
