import { BottomNav } from "@/components/app/BottomNav";
import { Sidebar } from "@/components/app/Sidebar";
import { TopBar } from "@/components/app/TopBar";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col lg:flex-row lg:gap-6 lg:p-6">
      <TopBar />
      <aside className="sticky top-6 hidden h-[calc(100dvh-3rem)] w-65 flex-none self-start lg:block">
        <Sidebar />
      </aside>
      <main className="flex min-w-0 flex-1 flex-col gap-6 px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-6 lg:p-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
