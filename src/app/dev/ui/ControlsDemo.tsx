"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { Switch } from "@/components/ui/Switch";

const categories = ["Design", "Development", "Research"];

export function ControlsDemo() {
  const [selected, setSelected] = useState(["Design"]);
  const [view, setView] = useState<"board" | "list">("board");
  const [alert, setAlert] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

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
      <Switch label="Get alert" checked={alert} onChange={setAlert} />
      <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)}>
        Open sheet
      </Button>
      <Sheet title="Sheet title" open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <p className="text-sm">Sheet content goes here.</p>
      </Sheet>
    </div>
  );
}
