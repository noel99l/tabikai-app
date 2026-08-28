import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { Card, Pill, SectionTitle, btnCls, btnGhostCls } from "./ui";
import { SubmitButton } from "@/components/submit-button";
import { approveShare, rejectShare, resolveShare } from "@/lib/actions/expenses";
import { fmtEventSpan, sinceLabel, yen } from "@/lib/format";
import { getApprovedMembers, requireTripContext } from "@/lib/session";

// 費用タブ内の「承認」セグメント本体(旧 /approvals ページ)
export async function ApprovalsContent() {
  const { user, trip, db, isAdmin } = await requireTripContext();

  // Neonは1往復が重いので、クエリは並列4本にまとめる
  // (shares系3クエリは trip 全体の1クエリに統合し、振り分けはJS側で行う)
  const [members, expenses, tripEvents, allShares] = await Promise.all([
    getApprovedMembers(),
    db.query.expenses.findMany({
      where: eq(schema.expenses.tripId, trip.id),
    }),
    // 費用に紐づくイベントのタイトル・日時表示用
    db.query.events.findMany({
      where: eq(schema.events.tripId, trip.id),
    }),
    db
      .select({
        expenseId: schema.expenseShares.expenseId,
        userId: schema.expenseShares.userId,
        amount: schema.expenseShares.amount,
        status: schema.expenseShares.status,
        createdAt: schema.expenseShares.createdAt,
      })
      .from(schema.expenseShares)
      .innerJoin(
        schema.expenses,
        eq(schema.expenses.id, schema.expenseShares.expenseId),
      )
      .where(eq(schema.expenses.tripId, trip.id)),
  ]);
  const nameOf = (id: string) =>
    members.find((m) => m.userId === id)?.name ?? "退会メンバー";
  const expenseOf = (id: string) => expenses.find((e) => e.id === id);
  const eventOf = (id: string | null) =>
    id ? tripEvents.find((e) => e.id === id) : undefined;

  // 自分の承認待ち
  const myPending = allShares.filter(
    (s) => s.userId === user.id && s.status === "pending",
  );

  // 主催者・管理者の操作対象: 本人が否認したもの+24時間以上未承認のもの
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
  const myEventIds = new Set(
    tripEvents.filter((e) => e.hostId === user.id).map((e) => e.id),
  );
  const stale = allShares.filter((s) => {
    const target =
      s.status === "rejected" ||
      (s.status === "pending" && s.createdAt < dayAgo);
    if (!target) return false;
    const x = expenseOf(s.expenseId);
    return isAdmin || (x?.eventId && myEventIds.has(x.eventId));
  });

  // 自分の承認履歴(直近)
  const myResolved = allShares
    .filter(
      (s) =>
        s.userId === user.id &&
        (s.status === "approved" ||
          s.status === "forced" ||
          s.status === "rejected"),
    )
    .slice(0, 5);

  return (
    <>
      <p className="mx-0.5 mb-2.5 text-[12.5px] text-muted">
        あなたが割り勘対象になっている費用です。内容を確認して承認してください。
      </p>

      {myPending.length === 0 && (
        <p className="rounded-[14px] border-2 border-line bg-white p-4 text-center shadow-[3px_3px_0_var(--color-line)] text-[12.5px] text-muted">
          承認待ちの費用はありません。
        </p>
      )}
      {myPending.map((s) => {
        const x = expenseOf(s.expenseId);
        if (!x) return null;
        const ev = eventOf(x.eventId);
        return (
          <Card key={s.expenseId} className="mb-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold">{x.title}</div>
                <div className="text-[11.5px] text-muted">
                  立替: {nameOf(x.paidBy)} · 合計 {yen(x.amount)}
                </div>
              </div>
              <Pill tone="pend">承認待ち</Pill>
            </div>
            {ev && (
              <div className="mt-2 rounded-lg bg-primary-soft px-2.5 py-1.5 text-[11.5px] font-semibold text-primary">
                関連イベント: {ev.title}({fmtEventSpan(ev.startsAt, ev.endsAt, ev.allDay)})
              </div>
            )}
            <div className="my-2 rounded-lg bg-screen px-2.5 py-2 text-[12.5px]">
              あなたの負担予定: <b className="tabular-nums">{yen(s.amount)}</b>
              <div className="mt-0.5 text-[10.5px] text-muted">
                他のメンバーの否認などで割り直された場合、金額が変わることがあります
              </div>
            </div>
            <div className="flex items-center gap-2">
              <form action={approveShare.bind(null, s.expenseId)} className="flex-1">
                <SubmitButton className={`${btnCls} w-full`}>承認する</SubmitButton>
              </form>
              {/* 否認は例外的な操作なので控えめに表示する */}
              <form action={rejectShare.bind(null, s.expenseId)} className="shrink-0">
                <SubmitButton
                  spinner={false}
                  className="rounded-[10px] border-2 border-line bg-white px-3 py-2.5 text-[11.5px] font-bold text-muted"
                >
                  否認
                </SubmitButton>
              </form>
            </div>
          </Card>
        );
      })}

      {stale.length > 0 && (
        <>
          <SectionTitle>主催者・管理者の操作(否認・24時間以上未承認)</SectionTitle>
          {stale.map((s) => {
            const x = expenseOf(s.expenseId)!;
            const ev = eventOf(x.eventId);
            return (
              <Card key={`${s.expenseId}-${s.userId}`} className="mb-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold">{x.title}</div>
                    <div className="text-[11.5px] text-muted">
                      未承認: {nameOf(s.userId)} · 負担予定 {yen(s.amount)}
                    </div>
                    {ev && (
                      <div className="text-[11.5px] text-muted">
                        関連イベント: {ev.title}({fmtEventSpan(ev.startsAt, ev.endsAt, ev.allDay)})
                      </div>
                    )}
                  </div>
                  {s.status === "rejected" ? (
                    <Pill tone="pend">否認</Pill>
                  ) : (
                    <Pill tone="pend">放置 {sinceLabel(s.createdAt)}</Pill>
                  )}
                </div>
                <form action={resolveShare} className="mt-2.5 flex gap-2">
                  <input type="hidden" name="expenseId" value={s.expenseId} />
                  <input type="hidden" name="userId" value={s.userId} />
                  <SubmitButton name="action" value="force" className={`${btnCls} flex-1 text-xs`}>
                    承認として確定
                  </SubmitButton>
                  <SubmitButton name="action" value="exclude" className={`${btnGhostCls} flex-1 text-xs`}>
                    割り勘対象から外す
                  </SubmitButton>
                </form>
              </Card>
            );
          })}
        </>
      )}

      {myResolved.length > 0 && (
        <>
          <SectionTitle>対応済み</SectionTitle>
          {myResolved.map((s) => {
            const x = expenseOf(s.expenseId);
            if (!x) return null;
            return (
              <Card
                key={s.expenseId}
                className="mb-2 flex items-center justify-between gap-2 opacity-65"
              >
                <div>
                  <div className="text-sm font-bold">{x.title}</div>
                  <div className="text-[11.5px] text-muted">
                    立替: {nameOf(x.paidBy)} · あなたの負担予定 {yen(s.amount)}
                  </div>
                </div>
                {s.status === "rejected" ? (
                  <Pill tone="pend">否認済み</Pill>
                ) : (
                  <Pill tone="ok">承認済み</Pill>
                )}
              </Card>
            );
          })}
        </>
      )}
    </>
  );
}
