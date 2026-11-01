"use client";

import { authClient } from "@/lib/auth/client";
import { useHydrated } from "@/lib/useHydrated";

export function SignOutButton() {
  const hydrated = useHydrated();

  async function signOut() {
    const { error } = await authClient.signOut();
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (!error) window.location.assign("/sign-in");
  }

  return (
    <button
      type="button"
      aria-label="Sign out"
      disabled={!hydrated}
      onClick={signOut}
      className="flex size-11 flex-none items-center justify-center rounded-xl text-[#3d3d3d]"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
      </svg>
    </button>
  );
}
