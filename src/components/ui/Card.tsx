import type { ComponentProps } from "react";

const tones = {
  white: "bg-white",
  blue: "bg-blue",
  sun: "bg-sun",
  teal: "bg-teal",
  coral: "bg-coral",
  "sun-tint": "bg-sun-tint",
  "teal-tint": "bg-teal-tint",
};

const shadows = {
  none: "",
  md: "shadow-hard-4",
  lg: "shadow-hard-5",
};

type CardProps = ComponentProps<"div"> & {
  tone?: keyof typeof tones;
  shadow?: keyof typeof shadows;
};

export function Card({ tone = "white", shadow = "lg", className = "", ...props }: CardProps) {
  return (
    <div
      {...props}
      className={`rounded-card border-hard ${tones[tone]} ${shadows[shadow]} ${className}`}
    />
  );
}
