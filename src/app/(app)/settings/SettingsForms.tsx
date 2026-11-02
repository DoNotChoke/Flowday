"use client";

import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { useHydrated } from "@/lib/useHydrated";
import { RestoreButton } from "../projects/[id]/ArchiveControls";
import { deleteCategoryAction, renameCategoryAction, updateProfileAction } from "./actions";

type Result = { fields: Record<string, string[] | undefined> } | undefined;

function firstError(result: Result) {
  return result && (Object.values(result.fields).flat()[0] ?? "");
}

function attempt(action: () => Promise<Result>) {
  return action().catch((failure) => {
    // A redirect from the action arrives here as a rejection.
    unstable_rethrow(failure);
    return { fields: { form: ["Could not reach Flowday. Check your connection and try again."] } };
  });
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex min-w-0 flex-col gap-4 rounded-[22px] border-hard bg-white p-5.5 shadow-hard-4">
      <h2 className="text-[17px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Alert({ message }: { message: string }) {
  return message ? (
    <p role="alert" className="text-sm font-medium text-danger">
      {message}
    </p>
  ) : null;
}

type Profile = { name: string; email: string; timezone: string | null };

export function ProfileForm({ profile, zones }: { profile: Profile; zones: string[] }) {
  const hydrated = useHydrated();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const zone = profile.timezone ?? "UTC";

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    const message = firstError(await attempt(() => updateProfileAction({ name: String(values.get("name")), timezone: String(values.get("timezone")) })));
    if (message !== undefined) {
      setPending(false);
      return setError(message);
    }
    // The sidebar's name is cached in the browser, and only a full load clears it.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/settings");
  }

  return (
    <Block title="Profile">
      <form onSubmit={save} className="flex flex-col gap-4">
        <Field label="Name" name="name" defaultValue={profile.name} maxLength={80} autoComplete="name" className="font-content" />
        <Field label="Email" defaultValue={profile.email} readOnly className="bg-[#f7f7f4]" />
        <Field as="select" label="Time zone" name="timezone" defaultValue={zone}>
          {(zones.includes(zone) ? zones : [zone, ...zones]).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Field>
        <Alert message={error} />
        <Button type="submit" size="md" disabled={!hydrated || pending} className="self-start">
          Save profile
        </Button>
      </form>
    </Block>
  );
}

function CategoryRow({ category }: { category: { id: string; name: string } }) {
  const hydrated = useHydrated();
  const [error, setError] = useState("");

  async function rename(input: HTMLInputElement) {
    const name = input.value.trim();
    if (!name || name === category.name) {
      input.value = category.name;
      return;
    }
    const message = firstError(await attempt(() => renameCategoryAction(category.id, name)));
    setError(message ?? "");
    if (message) input.value = category.name;
  }

  async function remove() {
    setError(firstError(await attempt(() => deleteCategoryAction(category.id))) ?? "");
  }

  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          type="text"
          aria-label={`Rename ${category.name}`}
          defaultValue={category.name}
          maxLength={40}
          disabled={!hydrated}
          onBlur={(event) => rename(event.currentTarget)}
          onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
          className="h-11 w-full min-w-0 flex-1 rounded-xl border-hard bg-white px-3 font-content text-sm pointer-coarse:text-base"
        />
        <Button variant="outline" size="sm" aria-label={`Delete ${category.name}`} disabled={!hydrated} onClick={remove}>
          Delete
        </Button>
      </div>
      <Alert message={error} />
    </li>
  );
}

export function Categories({ categories }: { categories: { id: string; name: string }[] }) {
  return (
    <Block title="Categories">
      <p className="text-sm text-muted">Deleting a category keeps its tasks.</p>
      <ul className="flex flex-col gap-2">
        {categories.map((category) => (
          <CategoryRow key={category.id} category={category} />
        ))}
      </ul>
    </Block>
  );
}

export function ArchivedProjects({ projects }: { projects: { id: string; name: string; color: string }[] }) {
  return (
    <Block title="Archived projects">
      {projects.length === 0 ? (
        <p className="text-sm text-muted">No archived projects</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {projects.map((project) => (
            <li key={project.id} className="flex items-center justify-between gap-3">
              <Link href={`/projects/${project.id}`} className="flex min-w-0 items-center gap-2 font-content text-sm font-medium">
                <span style={{ backgroundColor: project.color }} className="size-3 flex-none rounded-[4px] border border-ink" />
                <span className="truncate">{project.name}</span>
              </Link>
              <RestoreButton id={project.id} />
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}
