"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { authClient } from "@/lib/auth/client";
import { useHydrated } from "@/lib/useHydrated";

const scopeLabels: Record<string, string> = {
  openid: "Confirm who you are",
  profile: "See your name and email",
  offline_access: "Stay connected until you revoke access",
  "tasks:read": "View your tasks and projects",
  "tasks:write": "Create and change your tasks and projects",
};

const loopbackHosts = ["localhost", "127.0.0.1", "[::1]"];

export function ConsentForm() {
  const query = useSearchParams();
  const hydrated = useHydrated();
  const clientId = query.get("client_id") ?? "";
  const scopes = (query.get("scope") ?? "").split(" ").filter(Boolean);
  const host = URL.parse(query.get("redirect_uri") ?? "")?.hostname;
  const [clientName, setClientName] = useState<string>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    authClient.oauth2
      .publicClient({ query: { client_id: clientId } })
      .then(({ data }) => setClientName(data?.client_name ?? undefined))
      .catch(() => {});
  }, [clientId]);

  async function answer(accept: boolean) {
    setPending(true);
    setError(undefined);
    const { error } = await authClient.oauth2
      .consent({ accept })
      .catch(() => ({ error: { message: undefined } }));
    if (!error) return;

    setPending(false);
    setError(error.message ?? "Could not reach Flowday. Check your connection and try again.");
  }

  return (
    <div className="flex w-full max-w-110 flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-content text-[32px] leading-tight font-bold tracking-[-0.8px] break-words">
          Allow {clientName ?? "this app"}?
        </h1>
        <p className="text-[15px] text-muted">
          It will send you back to <span className="font-semibold break-all text-ink">{host}</span>
        </p>
      </div>

      {loopbackHosts.includes(host ?? "") && (
        <p className="rounded-control border-hard bg-sun-tint p-3.5 text-sm">
          This app runs on this device. Only continue if you started this connection yourself.
        </p>
      )}

      <ul className="flex list-disc flex-col gap-1.5 ps-5 text-[15px]">
        {scopes.map((scope) => (
          <li key={scope}>{scopeLabels[scope] ?? scope}</li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" disabled={pending || !hydrated} onClick={() => answer(false)}>
          Deny
        </Button>
        <Button disabled={pending || !hydrated} onClick={() => answer(true)}>
          Allow
        </Button>
      </div>
    </div>
  );
}
