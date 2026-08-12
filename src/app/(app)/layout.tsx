import { BottomNav } from "@/components/bottom-nav";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto min-h-dvh max-w-md px-3.5 pb-24">
      {children}
      <BottomNav />
    </div>
  );
}
