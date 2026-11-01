import type { Metadata } from "next";
import { SignUpForm } from "./SignUpForm";

export const metadata: Metadata = { title: "Flowday — Sign up" };

const steps = [
  { title: "Capture every task", text: "Name, priority, category — done in 5 seconds.", tone: "bg-sun", indent: "" },
  { title: "Plan it on your calendar", text: "Drag tasks onto days, get a nudge before deadlines.", tone: "bg-teal", indent: "lg:ml-8" },
  { title: "Keep the fire burning", text: "Build a streak and watch your year fill with green.", tone: "bg-coral", indent: "lg:ml-16" },
];

export default function SignUpPage() {
  return (
    <>
      <section className="flex min-w-0 items-center justify-center px-2 py-6 lg:flex-[1_1_440px]">
        <SignUpForm />
      </section>

      <section className="flex min-w-0 flex-col justify-center gap-7 rounded-[28px] border-hard bg-blue p-6 shadow-hard-6 lg:flex-[1_1_520px] lg:p-10">
        <h2 className="max-w-130 text-[32px] leading-tight font-bold tracking-[-1px] lg:text-[40px]">
          Three steps to a calmer day.
        </h2>
        <ol className="flex max-w-135 flex-col gap-4">
          {steps.map((step, index) => (
            <li key={step.title} className={`flex items-center gap-4 rounded-[18px] border-hard bg-white p-4.5 shadow-hard-4 ${step.indent}`}>
              <span className={`flex size-11 flex-none items-center justify-center rounded-xl border-hard font-bold ${step.tone}`}>
                {index + 1}
              </span>
              <span>
                <span className="block font-semibold">{step.title}</span>
                <span className="text-sm text-muted">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
