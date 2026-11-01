import { Suspense } from "react";
import { AccountSheet } from "./AccountSheet";
import { AppLogo } from "./AppLogo";
import { ProjectsSection } from "./ProjectsSection";
import { UserMenu } from "./UserMenu";

export function TopBar() {
  return (
    <header className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-6 lg:hidden">
      <AppLogo />
      <AccountSheet>
        <ProjectsSection />
        <Suspense>
          <UserMenu />
        </Suspense>
      </AccountSheet>
    </header>
  );
}
