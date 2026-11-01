import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { AppLogo } from "./AppLogo";
import { NavLinks } from "./NavLinks";
import { UserMenu } from "./UserMenu";

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

      {/* Scrolls on short screens so the account row below never leaves the viewport. */}
      <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-5.5 overflow-y-auto px-1">
        <div className="flex flex-col gap-1">
          <span className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-[1px] text-muted">WORKSPACE</span>
          <NavLinks />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between pr-1 pb-1.5 pl-2.5">
            <span className="text-[11px] font-semibold tracking-[1px] text-muted">PROJECTS</span>
            <Link
              href="/projects/new"
              aria-label="New project"
              className="flex size-7.5 items-center justify-center rounded-lg border-hard pointer-coarse:size-11"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </Link>
          </div>
          <p className="px-2.5 text-sm text-muted">No projects yet</p>
        </div>
      </div>

      <Suspense>
        <UserMenu />
      </Suspense>
    </nav>
  );
}
