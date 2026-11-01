import { getCurrentUser } from "@/lib/auth/session";
import { SignOutButton } from "./SignOutButton";

export async function UserMenu() {
  const user = await getCurrentUser();

  return (
    <div className="flex items-center gap-2.5 border-t-[1.5px] border-dashed border-[#cfcfcb] px-1.5 pt-3">
      <span className="flex size-9.5 flex-none items-center justify-center rounded-full border-hard bg-blue font-content text-sm font-semibold">
        {user.name[0]?.toUpperCase()}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-content text-sm font-semibold">{user.name}</span>
        <span className="truncate text-xs text-muted">{user.email}</span>
      </span>
      <SignOutButton />
    </div>
  );
}
