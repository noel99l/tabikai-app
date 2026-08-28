import Link from "next/link";
import { and, count, eq, inArray } from "drizzle-orm";
import { schema } from "@/db";
import { AppHeader } from "@/components/app-header";
import { ApprovalsContent } from "@/components/approvals-content";
import { ExpenseCreateFab } from "@/components/expense-create";
import { ExpenseRow } from "@/components/expense-row";
import { Card, Pill, SectionTitle } from "@/components/ui";
import { yen } from "@/lib/format";
import { getApprovedMembers, requireTripContext } from "@/lib/session";

// 費用一覧(既存の費用ページ本体)
async function ExpensesList() {
  const { user, trip, db, isAdmin } = await requireTripContext();
  const [expenses, members, tripEvents] = await Promise.all([
    db.query.expenses.findMany({
      where: eq(schema.expenses.tripId, trip.id),
      orderBy: (e, { desc }) => [desc(e.createdAt)],
    }),
    getApprovedMembers(),
    db.query.events.findMany({
      where: eq(schema.events.tripId, trip.id),
      orderBy: (e, { asc }) => [asc(e.startsAt)],
    }),
  ]);
  const shares = expenses.length
    ? await db.query.expenseShares.findMany({
        where: inArray(
          schema.expenseShares.expenseId,
          expenses.map((e) => e.id),
        ),
      })
    : [];
  // 費用フォームの「イベントの参加者から選択」用に参加登録者を取得
  const participants = tripEvents.length
    ? await db.query.eventParticipants.findMany({
        where: and(
          inArray(
            schema.eventParticipants.eventId,
            tripEvents.map((e) => e.id),
          ),
          eq(schema.eventParticipants.status, "joined"),
        ),
      })
    : [];
  const nameOf = (id: string) =>
    members.find((m) => m.userId === id)?.name ?? "退会メンバー";
  const eventTitleOf = (id: string | null) =>
    id ? (tripEvents.find((e) => e.id === id)?.title ?? null) : null;

  const groupTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const myConfirmed = shares
    .filter(
      (s) =>
        s.userId === user.id && (s.status === "approved" || s.status === "forced"),
    )
    .reduce((s, x) => s + x.amount, 0);

  const settlements = trip.expensesClosedAt
    ? await db.query.settlements.findMany({
        where: eq(schema.settlements.tripId, trip.id),
      })
    : [];
  const mySettlements = settlements.filter(
    (s) => s.fromUserId === user.id || s.toUserId === user.id,
  );

  return (
    <>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Card className="p-3">
          <div className="text-[11px] text-muted">グループ合計</div>
          <div className="text-xl font-extrabold tabular-nums">{yen(groupTotal)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] text-muted">あなたの負担(確定分)</div>
          <div className="text-xl font-extrabold tabular-nums">{yen(myConfirmed)}</div>
        </Card>
      </div>

      {expenses.length === 0 && (
        <p className="rounded-[14px] border-2 border-line bg-white p-4 text-center shadow-[3px_3px_0_var(--color-line)] text-[12.5px] text-muted">
          まだ費用がありません。右下の＋から追加してください。
        </p>
      )}

      {expenses.map((x) => {
        const xs = shares.filter((s) => s.expenseId === x.id);
        const canEdit =
          x.createdBy === user.id || x.paidBy === user.id || isAdmin;
        return (
          <ExpenseRow
            key={x.id}
            expense={{
              id: x.id,
              title: x.title,
              amount: x.amount,
              paidBy: x.paidBy,
              splitAll: x.splitAll,
              eventTitle: eventTitleOf(x.eventId),
            }}
            shares={xs.map((s) => ({
              userId: s.userId,
              name: nameOf(s.userId),
              amount: s.amount,
              status: s.status,
            }))}
            members={members.map((m) => ({ userId: m.userId, name: m.name }))}
            canEdit={canEdit}
          />
        );
      })}

      <SectionTitle>精算</SectionTitle>
      {trip.expensesClosedAt ? (
        <Card>
          <div className="text-sm font-bold">
            精算リスト <Pill tone="ok">締め済み</Pill>
          </div>
          {mySettlements.length === 0 ? (
            <p className="mt-1.5 text-xs text-muted">あなたの精算はありません。</p>
          ) : (
            mySettlements.map((s) => (
              <div key={s.id} className="mt-2 rounded-lg bg-screen px-2.5 py-2 text-[12.5px]">
                {s.fromUserId === user.id ? (
                  <>
                    <b>{nameOf(s.toUserId)} さんへ {yen(s.amount)} を支払う</b>
                  </>
                ) : (
                  <>
                    <b>{nameOf(s.fromUserId)} さんから {yen(s.amount)} を受け取る</b>
                  </>
                )}
              </div>
            ))
          )}
        </Card>
      ) : (
        <Card className="border-dashed">
          <div className="text-sm font-bold">
            精算 <Pill tone="info">締め後に表示</Pill>
          </div>
          <p className="mt-1 text-xs text-muted">
            管理者が経費入力を締め切ると、あなたの支払い先と金額がここに表示されます。
          </p>
        </Card>
      )}

      <ExpenseCreateFab
        members={members.map((m) => ({ userId: m.userId, name: m.name }))}
        events={tripEvents.map((e) => ({
          id: e.id,
          title: e.title,
          startMs: e.startsAt.getTime(),
          endMs: e.endsAt.getTime(),
          allDay: e.allDay,
          participantIds: participants
            .filter((p) => p.eventId === e.id)
            .map((p) => p.userId),
        }))}
        selfId={user.id}
      />
    </>
  );
}

// 費用ページ: [一覧 | 承認] セグメントで切替(承認は旧 /approvals を統合)
export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const showApprovals = tab === "approvals";
  const { user, trip, db } = await requireTripContext();
  // セグメントのバッジ用: 自分の承認待ち件数
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
    <>
      <AppHeader title="費用" />

      <div className="mb-3 flex gap-1.5 rounded-[13px] border-2 border-line bg-white p-1 shadow-[3px_3px_0_var(--color-line)]">
        <Link href="/expenses" className={segCls(!showApprovals)}>
          一覧
        </Link>
        <Link href="/expenses?tab=approvals" className={segCls(showApprovals)}>
          承認
          {pendingCount > 0 && (
            <span className="flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9.5px] font-bold text-white">
              {pendingCount}
            </span>
          )}
        </Link>
      </div>

      {showApprovals ? <ApprovalsContent /> : <ExpensesList />}
    </>
  );
}
