import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { ControlsDemo } from "./ControlsDemo";

const swatches = [
  "bg-ink",
  "bg-muted",
  "bg-panel",
  "bg-page",
  "bg-blue",
  "bg-sun",
  "bg-teal",
  "bg-coral",
  "bg-lilac",
  "bg-blue-tint",
  "bg-sun-tint",
  "bg-teal-tint",
  "bg-coral-tint",
  "bg-stone-tint",
  "bg-heat-0",
  "bg-heat-1",
  "bg-heat-2",
  "bg-heat-3",
  "bg-heat-4",
];

const shadows = ["shadow-hard-3", "shadow-hard-4", "shadow-hard-5", "shadow-hard-6"];

const textSizes = ["text-xs", "text-sm", "text-base", "text-xl", "text-3xl"];

export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-4 md:p-6">
      <h1 className="text-3xl font-bold">UI kit</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Colors</h2>
        <div className="flex flex-wrap gap-2">
          {swatches.map((swatch) => (
            <div key={swatch} className={`size-14 rounded-control border-hard ${swatch}`} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Shadows</h2>
        <div className="flex flex-wrap gap-4">
          {shadows.map((shadow) => (
            <div
              key={shadow}
              className={`rounded-card border-hard bg-white px-4 py-3 text-sm ${shadow}`}
            >
              {shadow}
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Type</h2>
        {textSizes.map((size) => (
          <p key={size} className={size}>
            Your daily adventure starts now.
          </p>
        ))}
        <p data-testid="vietnamese" className="text-xl">
          Việt Nam: kế hoạch hôm nay gồm rất nhiều việc nhỏ; thư viện ấy ở đạo phố Mỹ Đình, chữ ữ và ỹ.
        </p>
        <p className="font-semibold">Hoàn thành báo cáo tiến độ dự án trước thứ Sáu tuần này.</p>
        <p className="font-bold">Chuẩn bị tài liệu họp nhóm và gửi cho đội thiết kế.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Buttons</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary action</Button>
          <Button variant="secondary">Secondary action</Button>
          <Button variant="outline">Outline action</Button>
          <Button variant="dark">Dark action</Button>
          <Button href="/">Link action</Button>
          <Button size="md">Medium action</Button>
          <Button variant="outline" size="sm">
            Small action
          </Button>
          <Button disabled>Disabled action</Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Chips and segmented</h2>
        <ControlsDemo />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Form</h2>
        <Card className="grid gap-5 p-5 md:grid-cols-2 md:p-7">
          <Field label="Email" type="email" placeholder="you@gmail.com" hint="We never share your email." />
          <Field label="Password" type="password" error="Use at least 8 characters." />
          <Field as="textarea" label="Description" placeholder="Add your task details" />
          <Field as="select" label="Status">
            <option>On going</option>
            <option>In process</option>
          </Field>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Cards</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-5">White, large shadow</Card>
          <Card tone="sun-tint" shadow="md" className="p-5">
            Sun tint, medium shadow
          </Card>
          <Card tone="teal" shadow="none" className="p-5">
            Teal, no shadow
          </Card>
        </div>
      </section>

      <p data-testid="md-marker" className="hidden text-sm text-muted md:block">
        md breakpoint active
      </p>
    </main>
  );
}
