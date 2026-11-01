import { Suspense } from "react";
import { Sidebar } from "@/components/app/Sidebar";
import { UserMenu } from "@/components/app/UserMenu";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 gap-6 p-6">
      <aside className="sticky top-6 hidden w-65 flex-none self-start lg:block">
        <Sidebar />
      </aside>
      <main className="flex min-w-0 flex-1 flex-col gap-6">
        {children}
        {/* shortcut: account block for narrow screens until T1.8 adds the top bar and drawer. */}
        <div className="lg:hidden">
          <Suspense>
            <UserMenu />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
