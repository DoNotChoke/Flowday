import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUserId } from "@/lib/auth/session";
import { listCategories } from "@/services/categories";
import { getProfile } from "@/services/profile";
import { listArchivedProjects } from "@/services/projects";
import { ArchivedProjects, Categories, ProfileForm } from "./SettingsForms";

export const metadata: Metadata = { title: "Flowday — Settings" };

async function Content() {
  const userId = await requireUserId();
  const [profile, categories, archived] = await Promise.all([getProfile(userId), listCategories(userId), listArchivedProjects(userId)]);
  if (!profile) notFound();

  return (
    <>
      <ProfileForm profile={profile} zones={Intl.supportedValuesOf("timeZone")} />
      <Categories categories={categories} />
      <ArchivedProjects projects={archived} />
    </>
  );
}

export default function SettingsPage() {
  return (
    <>
      <h1 className="text-3xl font-bold">Settings</h1>
      <Suspense fallback={<div aria-hidden="true" className="h-64 animate-pulse rounded-card bg-panel motion-reduce:animate-none" />}>
        <Content />
      </Suspense>
    </>
  );
}
