import { Suspense } from "react";
import { and, count, eq } from "drizzle-orm";
import { schema } from "@/db";
import { AutoRefresh } from "@/components/auto-refresh";
import { BottomNav } from "@/components/bottom-nav";
import { requireTripContext } from "@/lib/session";

// 費用タブに載せる承認待ちバッジ(ナビ本体の描画をブロックしないようSuspenseで遅延)
async function ExpenseBadge() {
  const { user, trip, db } = await requireTripContext();
  const rows = await db
    .select({ value: count() })
    .from(schema.expenseShares)
    .innerJoin(schema.expenses, eq(schema.expenses.id, schema.expenseShares.expenseId))
    .where(
      and(
        eq(schema.expenses.tripId, trip.id),
        eq(schema.expenseShares.userId, user.id),
        eq(schema.expenseShares.status, "pending"),
      ),
    );
  const n = Number(rows[0]?.value ?? 0);
  if (n === 0) return null;
  return (
    <span className="absolute -top-1.5 -right-2.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full border-2 border-line bg-primary px-0.5 text-[9px] font-bold text-white">
      {n}
    </span>
  );
}

export default async function AppLayout({
  children,
  modal,
}: Readonly<{ children: React.ReactNode; modal: React.ReactNode }>) {
  // 未ログイン → /login、企画未選択 → /trips、参加承認待ち → /trips/pending
  await requireTripContext();
  return (
    <div className="mx-auto min-h-dvh max-w-md px-3.5 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <AutoRefresh />
      {children}
      {modal}
      <BottomNav
        expenseBadge={
          <Suspense fallback={null}>
            <ExpenseBadge />
          </Suspense>
        }
      />
    </div>
  );
}
