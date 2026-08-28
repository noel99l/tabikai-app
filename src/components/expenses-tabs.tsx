import Link from "next/link";
import { and, count, eq } from "drizzle-orm";
import { schema } from "@/db";
import { requireTripContext } from "@/lib/session";

// 費用ページ共通の [一覧 | 承認] セグメント(承認待ち件数バッジ付き)
export async function ExpensesTabs({ active }: { active: "list" | "approvals" }) {
  const { user, trip, db } = await requireTripContext();
  const pendingRows = await db
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
  const pendingCount = Number(pendingRows[0]?.value ?? 0);

  const segCls = (on: boolean) =>
    `flex flex-1 items-center justify-center gap-1.5 rounded-[9px] py-2 text-[12.5px] font-bold ${
      on ? "bg-ink text-screen" : "text-muted"
    }`;

  return (
    <div className="mb-3 flex gap-1.5 rounded-[13px] border-2 border-line bg-white p-1 shadow-[3px_3px_0_var(--color-line)]">
      <Link href="/expenses" prefetch={true} className={segCls(active === "list")}>
        一覧
      </Link>
      <Link href="/expenses/approvals" prefetch={true} className={segCls(active === "approvals")}>
        承認
        {pendingCount > 0 && (
          <span className="flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9.5px] font-bold text-white">
            {pendingCount}
          </span>
        )}
      </Link>
    </div>
  );
}
