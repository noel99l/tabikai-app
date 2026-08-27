import { BottomNav } from "@/components/bottom-nav";
import { requireTripContext } from "@/lib/session";

export default async function AppLayout({
  children,
  modal,
}: Readonly<{ children: React.ReactNode; modal: React.ReactNode }>) {
  // 未ログイン → /login、企画未選択 → /trips、参加承認待ち → /trips/pending
  await requireTripContext();
  return (
    <div className="mx-auto min-h-dvh max-w-md px-3.5 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      {children}
      {modal}
      <BottomNav />
    </div>
  );
}
