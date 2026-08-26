import { and, eq, inArray, lt, or } from "drizzle-orm";
import { schema } from "@/db";
import { AppHeader } from "@/components/app-header";
import { Card, Pill, SectionTitle, btnCls, btnGhostCls } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { approveShare, rejectShare, resolveShare } from "@/lib/actions/expenses";
import { fmtEventSpan, sinceLabel, yen } from "@/lib/format";
import { getApprovedMembers, requireTripContext } from "@/lib/session";

export default async function ApprovalsPage() {
  const { user, trip, db, isAdmin } = await requireTripContext();
  const members = await getApprovedMembers();
  const nameOf = (id: string) =>
    members.find((m) => m.userId === id)?.name ?? "退会メンバー";

  const expenses = await db.query.expenses.findMany({
    where: eq(schema.expenses.tripId, trip.id),
  });
  const expenseIds = expenses.map((e) => e.id);
  const expenseOf = (id: string) => expenses.find((e) => e.id === id);

  // 費用に紐づくイベントのタイトル・日時表示用
  const tripEvents = await db.query.events.findMany({
    where: eq(schema.events.tripId, trip.id),
  });
  const eventOf = (id: string | null) =>
    id ? tripEvents.find((e) => e.id === id) : undefined;

  // 自分の承認待ち
  const myPending = expenseIds.length
    ? await db.query.expenseShares.findMany({
        where: and(
          inArray(schema.expenseShares.expenseId, expenseIds),
          eq(schema.expenseShares.userId, user.id),
          eq(schema.expenseShares.status, "pending"),
        ),
      })
    : [];

  // 主催者・管理者の操作対象: 本人が否認したもの+24時間以上未承認のもの
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
  const staleAll = expenseIds.length
    ? await db.query.expenseShares.findMany({
        where: and(
          inArray(schema.expenseShares.expenseId, expenseIds),
          or(
            eq(schema.expenseShares.status, "rejected"),
            and(
              eq(schema.expenseShares.status, "pending"),
              lt(schema.expenseShares.createdAt, dayAgo),
            ),
          ),
        ),
      })
    : [];
  const myEventIds = new Set(
    tripEvents.filter((e) => e.hostId === user.id).map((e) => e.id),
  );
  const stale = staleAll.filter((s) => {
    const x = expenseOf(s.expenseId);
    return isAdmin || (x?.eventId && myEventIds.has(x.eventId));
  });

  // 自分の承認履歴(直近)
  const myResolved = expenseIds.length
    ? (
        await db.query.expenseShares.findMany({
          where: and(
            inArray(schema.expenseShares.expenseId, expenseIds),
            eq(schema.expenseShares.userId, user.id),
          ),
        })
      )
        .filter(
          (s) =>
            s.status === "approved" ||
            s.status === "forced" ||
            s.status === "rejected",
        )
        .slice(0, 5)
    : [];

  return (
    <>
      <AppHeader title="承認" />
      <p className="mx-0.5 mb-2.5 text-[12.5px] text-muted">
        あなたが割り勘対象になっている費用です。内容を確認して承認してください。
      </p>

      {myPending.length === 0 && (
        <p className="rounded-xl border border-line bg-white p-4 text-center text-[12.5px] text-muted">
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
              あなたの負担: <b className="tabular-nums">{yen(s.amount)}</b>
            </div>
            <div className="flex items-center gap-2">
              <form action={approveShare.bind(null, s.expenseId)} className="flex-1">
                <SubmitButton className={`${btnCls} w-full`}>承認する</SubmitButton>
              </form>
              {/* 否認は例外的な操作なので控えめに表示する */}
              <form action={rejectShare.bind(null, s.expenseId)} className="shrink-0">
                <SubmitButton
                  spinner={false}
                  className="rounded-lg border border-line bg-white px-3 py-2.5 text-[11.5px] font-bold text-muted"
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
                      未承認: {nameOf(s.userId)} · 負担 {yen(s.amount)}
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
                    立替: {nameOf(x.paidBy)} · あなたの負担 {yen(s.amount)}
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
