import { useId, type ComponentProps, type ElementType, type ReactNode } from "react";

type FieldProps = { label: string; hint?: string; error?: string; meter?: ReactNode } & (
  | ({ as?: "input" } & ComponentProps<"input">)
  | ({ as: "textarea" } & ComponentProps<"textarea">)
  | ({ as: "select" } & ComponentProps<"select">)
);

const shapes = {
  input: "h-12.5",
  textarea: "min-h-28 resize-y py-3.5 leading-relaxed",
  select: "select-chevron h-12.5 pe-10",
};

export function Field({ as = "input", label, hint, error, meter, id, className = "", ...props }: FieldProps) {
  const fallbackId = useId();
  const controlId = id ?? fallbackId;
  const messageId = `${controlId}-message`;
  const message = error ?? hint;
  const Control = as as ElementType;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={controlId} className="text-sm font-semibold">
        {label}
      </label>
      <Control
        {...props}
        id={controlId}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={`w-full rounded-control border-hard bg-white px-4 text-[15px] shadow-hard-3 placeholder:text-muted aria-invalid:border-danger pointer-coarse:text-base ${shapes[as]} ${className}`}
      />
      {meter}
      {message && (
        <p id={messageId} className={`text-xs ${error ? "font-medium text-danger" : "text-muted"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
