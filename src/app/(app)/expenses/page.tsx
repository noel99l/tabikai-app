import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { schema } from "@/db";
import { AppHeader } from "@/components/app-header";
import { ExpensesTabs } from "@/components/expenses-tabs";
import { ExpenseCreateFab } from "@/components/expense-create";
import { ExpenseRow } from "@/components/expense-row";
import { Card, Pill, SectionTitle } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { setSettlementReceived } from "@/lib/actions/expenses";
import { fmtDateTime } from "@/lib/format";
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
  // shares・領収書の有無・参加者は互いに独立なので並列で取得(Neonの往復削減)
  const [shares, receipts, participants] = await Promise.all([
    expenses.length
      ? db.query.expenseShares.findMany({
          where: inArray(
            schema.expenseShares.expenseId,
            expenses.map((e) => e.id),
          ),
        })
      : Promise.resolve([]),
    // 画像本体は載せずIDだけ(表示は /api/receipts/[id] から)
    expenses.length
      ? db
          .select({
            id: schema.expenseReceipts.id,
            expenseId: schema.expenseReceipts.expenseId,
          })
          .from(schema.expenseReceipts)
          .where(
            inArray(
              schema.expenseReceipts.expenseId,
              expenses.map((e) => e.id),
            ),
          )
          .orderBy(schema.expenseReceipts.createdAt)
      : Promise.resolve([]),
    // 費用フォームの「イベントの参加者から選択」用に参加登録者を取得
    tripEvents.length
      ? db.query.eventParticipants.findMany({
          where: and(
            inArray(
              schema.eventParticipants.eventId,
              tripEvents.map((e) => e.id),
            ),
            eq(schema.eventParticipants.status, "joined"),
          ),
        })
      : Promise.resolve([]),
  ]);
  const nameOf = (id: string) =>
    members.find((m) => m.userId === id)?.name ?? "退会メンバー";
  const eventTitleOf = (id: string | null) =>
    id ? (tripEvents.find((e) => e.id === id)?.title ?? null) : null;

  // 費用フォーム(登録・編集)の「イベント参加者」選択肢
  const eventOptions = tripEvents.map((e) => ({
    id: e.id,
    title: e.title,
    startMs: e.startsAt.getTime(),
    endMs: e.endsAt.getTime(),
    allDay: e.allDay,
    participantIds: participants.filter((p) => p.eventId === e.id).map((p) => p.userId),
  }));
  const memberOptions = members.map((m) => ({
    userId: m.userId,
    name: m.name,
    excludedFromAll: m.excludeFromSplitAll,
  }));

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

  // 締め後の精算リスト(自分の支払い・受け取り)。締め後はタブの一番上に表示する
  const settlementCard = trip.expensesClosedAt ? (
    <Card className="mb-3 border-l-[6px] border-l-ok">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-bold">精算リスト</div>
        <Pill tone="ok">締め済み</Pill>
      </div>
      {mySettlements.length === 0 ? (
        <p className="mt-1.5 text-xs text-muted">あなたの精算はありません。</p>
      ) : (
        mySettlements.map((s) => {
          const received = s.receivedAt !== null;
          return (
            <div
              key={s.id}
              className={`mt-2 rounded-lg px-2.5 py-2 text-[12.5px] ${received ? "bg-ok-soft" : "bg-screen"}`}
            >
              <div className="flex items-center justify-between gap-2">
                {s.fromUserId === user.id ? (
                  <b className={received ? "text-muted line-through" : ""}>
                    {nameOf(s.toUserId)} さんへ {yen(s.amount)} を支払う
                  </b>
                ) : (
                  <b className={received ? "text-muted line-through" : ""}>
                    {nameOf(s.fromUserId)} さんから {yen(s.amount)} を受け取る
                  </b>
                )}
                {s.toUserId === user.id ? (
                  // 受け取る側: 受取済のチェック(外すこともできる)
                  <form action={setSettlementReceived.bind(null, s.id, !received)} className="shrink-0">
                    <SubmitButton
                      spinner={false}
                      className={`flex items-center gap-1.5 rounded-full border-2 border-line px-2.5 py-1 text-[11px] font-bold ${
                        received ? "bg-ok text-white" : "bg-white text-ink"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-[4px] border-2 text-[10px] ${
                          received ? "border-white bg-white text-ok" : "border-line bg-white"
                        }`}
                        aria-hidden
                      >
                        {received && "✓"}
                      </span>
                      受取済
                    </SubmitButton>
                  </form>
                ) : received ? (
                  <Pill tone="ok">受け取り確認済み</Pill>
                ) : (
                  <Pill tone="pend">未払い</Pill>
                )}
              </div>
              {received && s.receivedAt && (
                <div className="mt-0.5 text-[10.5px] text-muted">
                  {fmtDateTime(s.receivedAt)} に受け取りを確認
                </div>
              )}
            </div>
          );
        })
      )}
      <p className="mt-2 text-[11px] text-muted">
        経費は締め切られています。費用の追加・変更はできません。
      </p>
    </Card>
  ) : null;

  return (
    <>
      {settlementCard}
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
              note: x.note,
              paidBy: x.paidBy,
              splitAll: x.splitAll,
              eventId: x.eventId,
              eventTitle: eventTitleOf(x.eventId),
              receiptIds: receipts.filter((r) => r.expenseId === x.id).map((r) => r.id),
            }}
            shares={xs.map((s) => ({
              userId: s.userId,
              name: nameOf(s.userId),
              amount: s.amount,
              status: s.status,
              reason: s.rejectReason,
            }))}
            members={memberOptions}
            events={eventOptions}
            selfId={user.id}
            canEdit={canEdit}
          />
        );
      })}

      {/* 締め前の案内(締め後は精算リストを一番上に表示する) */}
      {!trip.expensesClosedAt && (
        <>
          <SectionTitle>精算</SectionTitle>
          <Card className="border-dashed">
            <div className="text-sm font-bold">
              精算 <Pill tone="info">締め後に表示</Pill>
            </div>
            <p className="mt-1 text-xs text-muted">
              管理者が経費入力を締め切ると、あなたの支払い先と金額が費用タブの一番上に表示されます。
            </p>
          </Card>
        </>
      )}

      {/* 締め後は追加不可(サーバー側でも弾く) */}
      {!trip.expensesClosedAt && (
        <ExpenseCreateFab members={memberOptions} events={eventOptions} selfId={user.id} />
      )}
    </>
  );
}

// 費用ページ(一覧)。承認は /expenses/approvals(旧 ?tab=approvals はリダイレクト)
export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  if (tab === "approvals") redirect("/expenses/approvals");

  return (
    <>
      <AppHeader title="費用" />
      <ExpensesTabs active="list" />
      <ExpensesList />
    </>
  );
}
