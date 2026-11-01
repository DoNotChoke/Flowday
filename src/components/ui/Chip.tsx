import type { ComponentProps } from "react";

type ChipProps = ComponentProps<"button"> & { pressed: boolean };

export function Chip({ pressed, className = "", ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      {...props}
      className={`h-9.5 rounded-full border-hard px-4 text-[13px] font-medium pointer-coarse:min-h-11 ${pressed ? "bg-ink text-white" : "bg-white"} ${className}`}
    />
  );
}
