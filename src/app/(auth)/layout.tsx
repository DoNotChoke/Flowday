export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <main className="flex flex-1 flex-col gap-6 p-6 lg:flex-row">{children}</main>;
}
