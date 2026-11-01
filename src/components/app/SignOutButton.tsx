"use client";

import { Button } from "@/components/ui/Button";
import { authClient } from "@/lib/auth/client";

export function SignOutButton() {
  async function signOut() {
    const { error } = await authClient.signOut();
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (!error) window.location.assign("/sign-in");
  }

  return (
    <Button variant="outline" size="md" onClick={signOut}>
      Sign out
    </Button>
  );
}
