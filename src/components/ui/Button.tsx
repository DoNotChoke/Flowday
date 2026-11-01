import Link from "next/link";
import type { ComponentProps } from "react";

const variants = {
  primary: "bg-coral font-semibold shadow-hard-4",
  secondary: "bg-white font-medium shadow-hard-4",
  outline: "bg-white font-medium",
  dark: "bg-ink font-semibold text-white",
};

const sizes = {
  lg: "h-13 rounded-control px-6 text-[15px]",
  md: "h-11 rounded-xl px-4 text-sm",
  sm: "h-10 rounded-xl px-3.5 text-[13px]",
};

type Style = { variant?: keyof typeof variants; size?: keyof typeof sizes };
type ButtonProps = Style & (ComponentProps<"button"> | ComponentProps<typeof Link>);

export function Button({ variant = "primary", size = "lg", className = "", ...props }: ButtonProps) {
  const classes = `inline-flex items-center justify-center gap-2 border-hard pointer-coarse:min-h-11 pointer-coarse:min-w-11 ${variants[variant]} ${sizes[size]} ${className}`;

  if ("href" in props) return <Link {...props} className={classes} />;
  return <button type="button" {...props} className={classes} />;
}
