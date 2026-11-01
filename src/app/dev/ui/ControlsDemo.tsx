"use client";

import { useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { Segmented } from "@/components/ui/Segmented";

const categories = ["Design", "Development", "Research"];

export function ControlsDemo() {
  const [selected, setSelected] = useState(["Design"]);
  const [view, setView] = useState<"board" | "list">("board");

  function toggle(category: string) {
    setSelected((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {categories.map((category) => (
        <Chip
          key={category}
          pressed={selected.includes(category)}
          onClick={() => toggle(category)}
        >
          {category}
        </Chip>
      ))}
      <Segmented
        label="View"
        value={view}
        onChange={setView}
        options={[
          { value: "board", label: "Board" },
          { value: "list", label: "List" },
        ]}
      />
    </div>
  );
}
