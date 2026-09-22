import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { schema } from "@/db";
import { csvDateTime, csvResponse, toCsv } from "@/lib/csv";
import { getApprovedMembers, requireTripContext } from "@/lib/session";

export const dynamic = "force-dynamic";

// 管理者向け CSV 出力。
//   thanks          ありがとうポイントの明細(誰が誰に何pt・コメント・匿名)
//   thanks-summary  メンバー別の獲得・送付ポイント集計
//   settlements     精算リスト(締め後)。支払う人・受け取る人・金額・受取確認
//   balances        メンバー別の立替合計・負担合計・差額(対象外は除く)
export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const { trip, db, isAdmin } = await requireTripContext();
  if (!isAdmin) redirect("/home");

  const members = await getApprovedMembers();
  const nameOf = (id: string) => members.find((m) => m.userId === id)?.name ?? "退会メンバー";
  const stamp = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date()); // YYYY-MM-DD
  const base = `${trip.name}_${stamp}`;

  if (kind === "thanks" || kind === "thanks-summary") {
    const rows = await db.query.thanksPoints.findMany({
      where: eq(schema.thanksPoints.tripId, trip.id),
      orderBy: (t, { asc }) => [asc(t.createdAt)],
    });
    if (kind === "thanks") {
      const csv = toCsv([
        ["日時", "送った人", "受け取った人", "ポイント", "匿名", "コメント"],
        ...rows.map((r) => [
          csvDateTime(r.createdAt),
          nameOf(r.fromUserId),
          nameOf(r.toUserId),
          r.points,
          r.anonymous ? "匿名" : "",
          r.message,
        ]),
      ]);
      return csvResponse(csv, `${base}_ありがとう明細.csv`);
    }
    // メンバー別集計(退会メンバーも含めて集計する)
    const ids = [...new Set([...members.map((m) => m.userId), ...rows.flatMap((r) => [r.fromUserId, r.toUserId])])];
    const summary = ids
      .map((id) => {
        const recv = rows.filter((r) => r.toUserId === id);
        const sent = rows.filter((r) => r.fromUserId === id);
        return {
          name: nameOf(id),
          received: recv.reduce((s, r) => s + r.points, 0),
          receivedCount: recv.length,
          sent: sent.reduce((s, r) => s + r.points, 0),
          sentCount: sent.length,
        };
      })
      .sort((a, b) => b.received - a.received || a.name.localeCompare(b.name, "ja"));
    const csv = toCsv([
      ["メンバー", "獲得ポイント", "受け取り件数", "送ったポイント", "送った件数"],
      ...summary.map((s) => [s.name, s.received, s.receivedCount, s.sent, s.sentCount]),
    ]);
    return csvResponse(csv, `${base}_ありがとう集計.csv`);
  }

  if (kind === "settlements") {
    const rows = trip.expensesClosedAt
      ? await db.query.settlements.findMany({ where: eq(schema.settlements.tripId, trip.id) })
      : [];
    const csv = toCsv([
      ["支払う人", "受け取る人", "金額", "受取確認", "確認日時"],
      ...rows.map((s) => [
        nameOf(s.fromUserId),
        nameOf(s.toUserId),
        s.amount,
        s.receivedAt ? "済" : "",
        s.receivedAt ? csvDateTime(s.receivedAt) : "",
      ]),
      ...(trip.expensesClosedAt ? [] : [["(経費が締め切られていないため精算リストはまだありません)"]]),
    ]);
    return csvResponse(csv, `${base}_精算リスト.csv`);
  }

  if (kind === "balances") {
    const expenses = await db.query.expenses.findMany({ where: eq(schema.expenses.tripId, trip.id) });
    const shares = expenses.length
      ? await db.query.expenseShares.findMany({
          where: and(
            inArray(
              schema.expenseShares.expenseId,
              expenses.map((e) => e.id),
            ),
          ),
        })
      : [];
    const ids = [
      ...new Set([
        ...members.map((m) => m.userId),
        ...expenses.map((e) => e.paidBy),
        ...shares.map((s) => s.userId),
      ]),
    ];
    const rows = ids
      .map((id) => {
        const paid = expenses.filter((e) => e.paidBy === id).reduce((s, e) => s + e.amount, 0);
        const owed = shares
          .filter((s) => s.userId === id && s.status !== "excluded")
          .reduce((s, x) => s + x.amount, 0);
        const pending = shares
          .filter((s) => s.userId === id && (s.status === "pending" || s.status === "rejected"))
          .reduce((s, x) => s + x.amount, 0);
        return { name: nameOf(id), paid, owed, pending, net: paid - owed };
      })
      .sort((a, b) => b.net - a.net || a.name.localeCompare(b.name, "ja"));
    const csv = toCsv([
      ["メンバー", "立替合計", "負担合計", "うち未承認", "差額(+受け取り / -支払い)"],
      ...rows.map((r) => [r.name, r.paid, r.owed, r.pending, r.net]),
      [],
      ["費用合計", expenses.reduce((s, e) => s + e.amount, 0)],
      ["締め状態", trip.expensesClosedAt ? `締め済み(${csvDateTime(trip.expensesClosedAt)})` : "未締め"],
    ]);
    return csvResponse(csv, `${base}_メンバー別収支.csv`);
  }

  return new Response("not found", { status: 404 });
}
