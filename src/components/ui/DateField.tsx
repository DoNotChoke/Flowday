"use client";

import { useState } from "react";
import { Field } from "./Field";

type DateFieldProps = { label: string; name: string; error?: string; defaultValue?: string };

// iOS writes the value in words ("6 thg 11, 2026") and no CSS can change that, so touch screens show our own text over it.
export function DateField(props: DateFieldProps) {
  const [value, setValue] = useState(props.defaultValue ?? "");

  return (
    <Field
      {...props}
      type="date"
      onChange={(event) => setValue(event.target.value)}
      className="pointer-coarse:text-transparent pointer-coarse:[-webkit-text-fill-color:transparent]"
      overlay={
        <span aria-hidden="true" className={`pointer-events-none absolute inset-y-0 left-4.5 hidden items-center text-base pointer-coarse:flex ${value ? "" : "text-muted"}`}>
          {value ? value.split("-").reverse().join("/") : "dd/mm/yyyy"}
        </span>
      }
    />
  );
}
