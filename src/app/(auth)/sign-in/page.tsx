import type { Metadata } from "next";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Flowday — Sign in" };

const stats = [
  { label: "On going", count: "24 Tasks", tone: "bg-blue" },
  { label: "Completed", count: "42 Tasks", tone: "bg-teal" },
];

export default function SignInPage() {
  return (
    <>
      <section className="order-last flex min-w-0 flex-col justify-between gap-10 overflow-hidden rounded-[28px] border-hard bg-sun p-6 shadow-hard-6 lg:order-none lg:flex-[1_1_520px] lg:p-10">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-ink">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-sun)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <span className="text-2xl font-bold tracking-[-0.5px]">Flowday</span>
        </div>

        <div className="flex max-w-130 flex-col gap-3.5">
          <h1 className="text-4xl leading-[1.12] font-bold tracking-[-1.5px] lg:text-5xl">Your daily adventure starts now.</h1>
          <p className="text-[17px] leading-relaxed text-[#3a3200]">
            Plan tasks, keep your streak alive and see every hour of work add up — all in one calm workspace.
          </p>
        </div>

        <div className="grid max-w-140 grid-cols-2 gap-4" aria-hidden="true">
          {stats.map((stat) => (
            <div key={stat.label} className={`rounded-[18px] border-hard p-4 shadow-hard-4 ${stat.tone}`}>
              <div className="text-[15px] font-semibold">{stat.label}</div>
              <div className="text-xs">{stat.count}</div>
            </div>
          ))}
          <div className="col-span-2 flex items-center justify-between gap-4 rounded-[18px] border-hard bg-white px-4.5 py-4 shadow-hard-4">
            <div>
              <div className="text-[15px] font-semibold">12-day streak</div>
              <div className="text-xs text-muted">Finish 1 task today to keep it burning</div>
            </div>
            <div className="flex gap-1">
              {["bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4", "bg-heat-3"].map((tone, index) => (
                <span key={index} className={`h-7 w-2.5 rounded ${tone}`} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="flex min-w-0 items-center justify-center px-2 py-6 lg:flex-[1_1_440px]">
        <SignInForm />
      </section>
    </>
  );
}
