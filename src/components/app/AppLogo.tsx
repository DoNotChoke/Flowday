import Link from "next/link";

export function AppLogo() {
  return (
    <Link href="/tasks" className="flex items-center gap-2.5 px-1.5 pointer-coarse:min-h-11">
      <span className="flex size-9.5 items-center justify-center rounded-[11px] bg-ink">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-sun)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <span className="text-xl font-bold tracking-[-0.4px]">Flowday</span>
    </Link>
  );
}
