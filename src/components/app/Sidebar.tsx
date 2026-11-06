import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { requireUserId } from "@/lib/auth/session";
import { countOpenTasks } from "@/services/board";
import { getStreak } from "@/services/stats";
import { AppLogo } from "./AppLogo";
import { Flame } from "./Flame";
import { FocusPill } from "./FocusPill";
import { NavLinks } from "./NavLinks";
import { ProjectsSection } from "./ProjectsSection";
import { UserMenu } from "./UserMenu";

async function OpenTaskCount() {
  return <span className="text-xs text-muted">{await countOpenTasks(await requireUserId())}</span>;
}

async function StreakLink() {
  const { current } = await getStreak(await requireUserId());
  return (
    <Link href="/history" className="flex flex-none items-center gap-3 rounded-control border-hard bg-sun-tint px-3.5 py-3">
      <Flame size={30} lit={current > 0} />
      <span className="flex flex-col">
        <span className="text-[15px] font-bold">
          {current} {current === 1 ? "day" : "days"}
        </span>
        <span className="text-xs text-muted">Current streak</span>
      </span>
    </Link>
  );
}

export function Sidebar() {
  return (
    <nav aria-label="Main" className="flex h-full flex-col gap-5.5 rounded-card border-hard bg-white px-4 py-5.5 shadow-hard-5">
      <AppLogo />

      <Button href="/tasks/new" size="md" className="h-12 flex-none">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        New task
      </Button>

      <Suspense>
        <FocusPill />
      </Suspense>

      {/* Scrolls on short screens so the account row below never leaves the viewport. */}
      <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-5.5 overflow-y-auto px-1">
        <div className="flex flex-col gap-1">
          <span className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-[1px] text-muted">WORKSPACE</span>
          <Suspense>
            <NavLinks taskCount={<Suspense><OpenTaskCount /></Suspense>} />
          </Suspense>
        </div>

        <ProjectsSection />
      </div>

      <Suspense>
        <StreakLink />
      </Suspense>

      <Suspense>
        <UserMenu />
      </Suspense>
    </nav>
  );
}
