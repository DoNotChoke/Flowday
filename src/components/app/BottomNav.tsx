"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { links } from "./NavLinks";

const shortLabels: Record<string, string> = { "/tasks": "Tasks", "/focus": "Focus" };

export function BottomNav() {
  const pathname = usePathname();
  const items = links.slice(0, 4).map(({ label, href, icon }) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex flex-col items-center justify-center gap-0.5 text-[11px] ${active ? "font-semibold" : "font-medium text-muted"}`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={icon} />
        </svg>
        {shortLabels[href] ?? label}
      </Link>
    );
  });

  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-10 border-t-[1.5px] border-ink bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="grid h-16 grid-cols-5">
        {items.slice(0, 2)}
        <Link
          href="/tasks/new"
          aria-label="New task"
          className="m-auto flex size-12 items-center justify-center rounded-full border-hard bg-coral shadow-hard-3"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
        {items.slice(2)}
      </div>
    </nav>
  );
}
