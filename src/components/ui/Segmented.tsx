import type { ReactNode } from "react";

type SegmentedProps<Value extends string> = {
  label: string;
  options: { value: Value; label: ReactNode }[];
  value: Value;
  onChange: (value: Value) => void;
};

export function Segmented<Value extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedProps<Value>) {
  return (
    <div role="group" aria-label={label} className="flex rounded-xl border-hard bg-white p-0.75">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`flex h-8.5 items-center gap-1.5 rounded-[9px] px-3.5 text-[13px] pointer-coarse:min-h-11 ${selected ? "bg-sun-tint font-semibold" : ""}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
