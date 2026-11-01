import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { NavLinks } from "./NavLinks";
import { UserMenu } from "./UserMenu";

export function Sidebar() {
  return (
    <nav aria-label="Main" className="flex flex-col gap-5.5 rounded-card border-hard bg-white px-4 py-5.5 shadow-hard-5">
      <Link href="/tasks" className="flex items-center gap-2.5 px-1.5">
        <span className="flex size-9.5 items-center justify-center rounded-[11px] bg-ink">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-sun)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        <span className="text-xl font-bold tracking-[-0.4px]">Flowday</span>
      </Link>

      <Button href="/tasks/new" size="md" className="h-12">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        New task
      </Button>

      <div className="flex flex-col gap-1">
        <span className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-[1px] text-muted">WORKSPACE</span>
        <NavLinks />
      </div>

      <Suspense>
        <UserMenu />
      </Suspense>
    </nav>
  );
}
