import type { Metadata } from "next";
import { Timer } from "./Timer";

export const metadata: Metadata = { title: "Flowday — Focus mode" };

export default function FocusPage() {
  return (
    <>
      <h1 className="sr-only">Focus mode</h1>
      <div className="flex flex-wrap items-start gap-6">
        <Timer />
      </div>
    </>
  );
}
