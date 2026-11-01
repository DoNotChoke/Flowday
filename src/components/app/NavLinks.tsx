"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export const links = [
  { label: "My tasks", href: "/tasks", icon: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
  { label: "Calendar", href: "/calendar", icon: "M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" },
  { label: "History", href: "/history", icon: "M3 3v18h18M8 17v-5M13 17V8M18 17v-9" },
  { label: "Focus mode", href: "/focus", icon: "M12 9v4l2.5 2M9 2h6M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" },
  { label: "Settings", href: "/settings", icon: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" },
];

export function NavLinks({ taskCount }: { taskCount?: ReactNode }) {
  const pathname = usePathname();

  return links.map(({ label, href, icon }) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex h-11.5 items-center gap-3 rounded-xl border-[1.5px] px-3 text-sm ${active ? "border-ink bg-sun-tint font-semibold" : "border-transparent font-medium text-[#3d3d3d]"}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={icon} />
        </svg>
        <span className="flex-1">{label}</span>
        {href === "/tasks" && taskCount}
      </Link>
    );
  });
}
