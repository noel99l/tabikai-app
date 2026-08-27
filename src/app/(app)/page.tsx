import Link from "next/link";
import { and, asc, count, eq, gte } from "drizzle-orm";
import { schema } from "@/db";
import { AppHeader } from "@/components/app-header";
import { IconSettings, IconUsers } from "@/components/icons";
import { InstallPrompt } from "@/components/install-prompt";
import { TripLogo } from "@/components/trip-logo";
import { Card, Pill, SectionTitle } from "@/components/ui";
import { fmtDateTime, fmtTime, untilLabel, yen } from "@/lib/format";
import { getApprovedMembers, requireTripContext } from "@/lib/session";

// ダッシュボード: イベントロゴ / 次の予定 / 未承認のコスト
export default async function DashboardPage() {
  const { user, trip, db, isAdmin } = await requireTripContext();

  // 依存のないクエリは並列で1往復にまとめる
  const [members, upcoming, myPending, pendingMemberRows] = await Promise.all([
    getApprovedMembers(),
    // 次の予定: 自分が参加登録/招待されている今後のイベント
    db
      .select({
        id: schema.events.id,
        title: schema.events.title,
        startsAt: schema.events.startsAt,
        endsAt: schema.events.endsAt,
        status: schema.eventParticipants.status,
        venueName: schema.venues.name,
      })
      .from(schema.eventParticipants)
      .innerJoin(schema.events, eq(schema.events.id, schema.eventParticipants.eventId))
      .innerJoin(schema.venues, eq(schema.venues.id, schema.events.venueId))
      .where(
        and(
          eq(schema.events.tripId, trip.id),
          eq(schema.eventParticipants.userId, user.id),
          // 終日(会場確保)の予定は「次の予定」に出さない
          eq(schema.events.allDay, false),
          gte(schema.events.endsAt, new Date()),
        ),
      )
      .orderBy(asc(schema.events.startsAt))
      .limit(3),
    // 未承認のコスト: 費用一覧を経由せず1クエリで自分のpendingを取得
    db
      .select({
        expenseId: schema.expenseShares.expenseId,
        amount: schema.expenseShares.amount,
        title: schema.expenses.title,
      })
      .from(schema.expenseShares)
      .innerJoin(
        schema.expenses,
        eq(schema.expenses.id, schema.expenseShares.expenseId),
      )
      .where(
        and(
          eq(schema.expenses.tripId, trip.id),
          eq(schema.expenseShares.userId, user.id),
          eq(schema.expenseShares.status, "pending"),
        ),
      ),
    // 管理者向け: 参加承認待ちの人数
    isAdmin
      ? db
          .select({ value: count() })
          .from(schema.tripMembers)
          .where(
            and(
              eq(schema.tripMembers.tripId, trip.id),
              eq(schema.tripMembers.status, "pending"),
            ),
          )
      : Promise.resolve([{ value: 0 }]),
  ]);
  const pendingMembers = pendingMemberRows[0] ?? { value: 0 };
  const pendingTotal = myPending.reduce((s, x) => s + x.amount, 0);

  return (
    <>
      <AppHeader title="ホーム" />

      <InstallPrompt />

      <Card className="flex flex-col items-center py-5 text-center">
        <TripLogo logoUrl={trip.logoUrl} size={72} radius={20} />
        <div className="mt-2.5 text-lg font-extrabold">{trip.name}</div>
        <div className="text-xs text-muted">
          {fmtDateTime(trip.startsAt)} – {fmtDateTime(trip.endsAt)} · 参加{members.length}人
        </div>
        <Link
          href="/trips"
          className="mt-2.5 rounded-lg bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary"
        >
          イベントを切り替え
        </Link>
      </Card>

      {isAdmin && pendingMembers.value > 0 && (
        <Link href="/manage/members" className="mt-2.5 block">
          <Card className="flex items-center gap-3 border-pend bg-pend-soft">
            <IconUsers className="h-5 w-5 text-pend" />
            <span className="flex-1 text-[13px] font-bold text-pend">
              参加承認待ちが {pendingMembers.value} 人います
            </span>
          </Card>
        </Link>
      )}
      {isAdmin && (
        <Link href="/manage" className="mt-2.5 block">
          <Card className="flex items-center gap-3">
            <IconSettings className="h-5 w-5 text-primary" />
            <span className="flex-1 text-[13px] font-bold text-primary">
              管理者コンソール(会場・旅程・メンバー・アナウンス)
            </span>
            <span className="text-muted">›</span>
          </Card>
        </Link>
      )}

      <SectionTitle>次の予定</SectionTitle>
      {upcoming.length === 0 && (
        <Card>
          <p className="text-center text-[12.5px] text-muted">
            今後の予定はありません。
            <Link href="/schedule/new" className="font-bold text-primary">
              イベントを作成
            </Link>
            しましょう。
          </p>
        </Card>
      )}
      {upcoming.map((e, i) => {
        const until = untilLabel(e.startsAt);
        return (
          <Card
            key={e.id}
            className={`mb-2.5 ${i === 0 ? "border-l-4 border-l-violet" : "opacity-80"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold">{e.title}</div>
                <div className="text-[11.5px] text-muted">
                  {fmtDateTime(e.startsAt)} – {fmtTime(e.endsAt)} · {e.venueName}
                  {e.status === "joined" ? " · 参加登録済み" : ""}
                </div>
              </div>
              {until && e.status === "joined" ? (
                <Pill tone="pend">{until}</Pill>
              ) : e.status === "invited" ? (
                <Pill tone="info">招待あり</Pill>
              ) : null}
            </div>
            {i === 0 && (
              <div className="mt-2.5 flex gap-2">
                <Link
                  href={`/events/${e.id}`}
                  className="flex-1 rounded-lg bg-primary px-3 py-2 text-center text-xs font-bold text-white"
                >
                  詳細を見る
                </Link>
                <Link
                  href="/schedule"
                  className="flex-1 rounded-lg bg-primary-soft px-3 py-2 text-center text-xs font-bold text-primary"
                >
                  予定表へ
                </Link>
              </div>
            )}
          </Card>
        );
      })}

      <SectionTitle>未承認のコスト</SectionTitle>
      {myPending.length === 0 ? (
        <Card>
          <p className="text-center text-[12.5px] text-muted">未承認のコストはありません。</p>
        </Card>
      ) : (
        <Card>
          {myPending.map((s) => (
            <div key={s.expenseId} className="mb-2.5 flex items-center justify-between gap-2">
              <div>
                <div className="text-[13.5px] font-bold">{s.title}</div>
                <div className="text-[11.5px] text-muted">あなたの負担 {yen(s.amount)}</div>
              </div>
              <Pill tone="pend">承認待ち</Pill>
            </div>
          ))}
          <Link
            href="/approvals"
            className="block w-full rounded-lg bg-primary px-3 py-2.5 text-center text-[13px] font-bold text-white"
          >
            承認画面へ({myPending.length}件 · 合計 {yen(pendingTotal)})
          </Link>
        </Card>
      )}
    </>
  );
}
