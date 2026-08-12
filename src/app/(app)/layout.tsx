import { BottomNav } from "@/components/bottom-nav";
import { requireTripContext } from "@/lib/session";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // 未ログイン → /login、企画未選択 → /trips、参加承認待ち → /trips/pending
  await requireTripContext();
  return (
    <div className="mx-auto min-h-dvh max-w-md px-3.5 pb-24">
      {children}
      <BottomNav />
    </div>
  );
}
