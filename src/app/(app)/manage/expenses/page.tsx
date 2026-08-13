import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { schema } from "@/db";
import { AppHeader } from "@/components/app-header";
import { IconBack } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { Card, Pill, SectionTitle, btnCls, btnGhostCls } from "@/components/ui";
import { closeExpenses, reopenExpenses } from "@/lib/actions/expenses";
import { yen } from "@/lib/format";
import { getApprovedMembers, requireTripContext } from "@/lib/session";

export default async function ManageExpensesPage() {
  const { trip, db, isAdmin } = await requireTripContext();
  if (!isAdmin) redirect("/");

  const members = await getApprovedMembers();
  const nameOf = (id: string) =>
    members.find((m) => m.userId === id)?.name ?? "退会メンバー";

  const expenses = await db.query.expenses.findMany({
    where: eq(schema.expenses.tripId, trip.id),
  });
  const shares = expenses.length
    ? await db.query.expenseShares.findMany({
        where: inArray(
          schema.expenseShares.expenseId,
          expenses.map((e) => e.id),
        ),
      })
    : [];
  const pendingCount = shares.filter((s) => s.status === "pending").length;
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const settlements = trip.expensesClosedAt
    ? await db.query.settlements.findMany({
        where: eq(schema.settlements.tripId, trip.id),
      })
    : [];

  return (
    <>
      <AppHeader title="精算" />
      <Link
        href="/manage"
        className="mb-2 flex items-center gap-1 text-[13px] font-bold text-primary"
      >
        <IconBack className="h-4 w-4" />
        管理者コンソールへ戻る
      </Link>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <Card className="p-3">
          <div className="text-[11px] text-muted">費用の合計</div>
          <div className="text-xl font-extrabold tabular-nums">{yen(total)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] text-muted">未承認の割り勘</div>
          <div className={`text-xl font-extrabold ${pendingCount > 0 ? "text-pend" : ""}`}>
            {pendingCount}件
          </div>
        </Card>
      </div>

      {!trip.expensesClosedAt ? (
        <Card>
          <h3 className="text-sm font-bold">経費を締めて精算を公開</h3>
          <p className="mt-1 mb-2.5 text-[12px] text-muted">
            締めると割り勘が確定し、送金回数が最少になる精算リストを全員に公開します。
            {pendingCount > 0 && (
              <span className="font-bold text-pend">
                {" "}未承認 {pendingCount} 件も確定として計算されます。
              </span>
            )}
          </p>
          <form action={closeExpenses}>
            <SubmitButton className={`${btnCls} w-full py-3`}>
              経費を締めて精算を公開する
            </SubmitButton>
          </form>
        </Card>
      ) : (
        <>
          <Card>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">精算リスト</h3>
              <Pill tone="ok">締め済み</Pill>
            </div>
            {settlements.length === 0 ? (
              <p className="mt-2 text-xs text-muted">精算の必要はありません。</p>
            ) : (
              <div className="mt-2 overflow-hidden rounded-lg border border-line">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-screen text-[11px] text-muted">
                      <th className="px-2.5 py-2 text-left font-semibold">支払う人</th>
                      <th className="px-2.5 py-2 text-left font-semibold">受け取る人</th>
                      <th className="px-2.5 py-2 text-right font-semibold">金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlements.map((s) => (
                      <tr key={s.id} className="border-t border-line">
                        <td className="px-2.5 py-2">{nameOf(s.fromUserId)}</td>
                        <td className="px-2.5 py-2">{nameOf(s.toUserId)}</td>
                        <td className="px-2.5 py-2 text-right font-bold tabular-nums">
                          {yen(s.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <SectionTitle>締めを解除</SectionTitle>
          <Card>
            <p className="mb-2.5 text-[12px] text-muted">
              費用の追加・修正が必要な場合は、締めを解除して精算リストを取り消せます。
              修正後にもう一度締め直してください。
            </p>
            <form action={reopenExpenses}>
              <SubmitButton className={`${btnGhostCls} w-full py-2.5`}>
                締めを解除する
              </SubmitButton>
            </form>
          </Card>
        </>
      )}
    </>
  );
}
