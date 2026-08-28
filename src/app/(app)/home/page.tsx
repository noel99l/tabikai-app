import Link from "next/link";
import { and, asc, count, eq, gte, sql } from "drizzle-orm";
import { schema } from "@/db";
import { AnnounceFab } from "@/components/announce-fab";
import { AppHeader } from "@/components/app-header";
import { EventIcon, eventColorClass } from "@/components/event-icons";
import { IconCalendar, IconCart, IconMail, IconMoney, IconSettings, IconUsers } from "@/components/icons";
import { InstallPrompt } from "@/components/install-prompt";
import { PushNudge } from "@/components/push-nudge";
import { TripLogo } from "@/components/trip-logo";
import { Card, Pill } from "@/components/ui";
import { fmtDateTime, fmtTime, yen } from "@/lib/format";
import { requireTripContext } from "@/lib/session";

// ヒーローのカウントダウン(大きな数字+単位)
function countdown(d: Date, now = new Date()): { n: number; u: string } {
  const diffMin = Math.max(0, Math.round((d.getTime() - now.getTime()) / 60000));
  if (diffMin < 60) return { n: diffMin, u: "分後" };
  if (diffMin < 60 * 24) return { n: Math.floor(diffMin / 60), u: "時間後" };
  return { n: Math.floor(diffMin / 60 / 24), u: "日後" };
}

// やること1行(タップで該当ページへ)
function TaskRow({
  href,
  icon,
  iconBg,
  title,
  sub,
  cta,
  solid = false,
}: {
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  sub?: string;
  cta: string;
  solid?: boolean;
}) {
  return (
    <Link href={href} prefetch={true} className="block">
      <Card className="mb-2 flex items-center gap-3 py-2.5">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border-2 border-line ${iconBg}`}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-bold">{title}</div>
          {sub && <div className="truncate text-[10.5px] text-muted">{sub}</div>}
        </div>
        <span
          className={`shrink-0 rounded-full border-2 border-line px-3 py-1.5 text-[11px] font-bold ${
            solid
              ? "bg-primary text-white shadow-[2px_2px_0_var(--color-line)]"
              : "bg-white text-primary"
          }`}
        >
          {cta}
        </span>
      </Card>
    </Link>
  );
}

// ダッシュボード: 次の予定ヒーロー / やること / この後の予定
export default async function DashboardPage() {
  const { user, trip, db, isAdmin } = await requireTripContext();
  const now = new Date();

  const [upcoming, myPending, invitedRows, itemRows, pendingMemberRows] = await Promise.all([
    // 自分が参加登録/招待されている今後のイベント(終日は除く)
    db
      .select({
        id: schema.events.id,
        title: schema.events.title,
        startsAt: schema.events.startsAt,
        endsAt: schema.events.endsAt,
        status: schema.eventParticipants.status,
        venueName: schema.venues.name,
        color: schema.events.color,
        icon: schema.events.icon,
      })
      .from(schema.eventParticipants)
      .innerJoin(schema.events, eq(schema.events.id, schema.eventParticipants.eventId))
      .innerJoin(schema.venues, eq(schema.venues.id, schema.events.venueId))
      .where(
        and(
          eq(schema.events.tripId, trip.id),
          eq(schema.eventParticipants.userId, user.id),
          eq(schema.events.allDay, false),
          gte(schema.events.endsAt, now),
        ),
      )
      .orderBy(asc(schema.events.startsAt))
      .limit(6),
    // 未承認のコスト(自分のpending)
    db
      .select({ amount: schema.expenseShares.amount })
      .from(schema.expenseShares)
      .innerJoin(schema.expenses, eq(schema.expenses.id, schema.expenseShares.expenseId))
      .where(
        and(
          eq(schema.expenses.tripId, trip.id),
          eq(schema.expenseShares.userId, user.id),
          eq(schema.expenseShares.status, "pending"),
        ),
      ),
    // 未返事のイベント招待数
    db
      .select({ value: count() })
      .from(schema.eventParticipants)
      .innerJoin(schema.events, eq(schema.events.id, schema.eventParticipants.eventId))
      .where(
        and(
          eq(schema.events.tripId, trip.id),
          eq(schema.eventParticipants.userId, user.id),
          eq(schema.eventParticipants.status, "invited"),
          gte(schema.events.endsAt, now),
        ),
      ),
    // 買い出し・持ち物の残り(名前3件+総数を1クエリで)
    db
      .select({
        name: schema.items.name,
        total: sql<number>`count(*) over()`,
      })
      .from(schema.items)
      .where(and(eq(schema.items.tripId, trip.id), eq(schema.items.done, false)))
      .limit(3),
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

  const [hero, ...rest] = upcoming;
  const pendingCount = myPending.length;
  const pendingTotal = myPending.reduce((s, x) => s + x.amount, 0);
  const invitedCount = Number(invitedRows[0]?.value ?? 0);
  const itemsLeft = Number(itemRows[0]?.total ?? 0);
  const pendingMembers = Number(pendingMemberRows[0]?.value ?? 0);
  const taskCount =
    (pendingCount > 0 ? 1 : 0) +
    (invitedCount > 0 ? 1 : 0) +
    (itemsLeft > 0 ? 1 : 0) +
    (pendingMembers > 0 ? 1 : 0);
  const c = hero ? countdown(hero.startsAt, now) : null;

  return (
    <>
      <AppHeader
        title={trip.name}
        leading={
          <Link href="/trips" aria-label="イベントを切り替え" className="shrink-0">
            <TripLogo logoUrl={trip.logoUrl} size={34} radius={11} />
          </Link>
        }
      />

      <InstallPrompt />
      <PushNudge />

      {/* つぎの予定ヒーロー */}
      {hero ? (
        <Card className="border-l-[6px] border-l-violet">
          <div className="text-[10.5px] font-extrabold tracking-[0.12em] text-violet">
            つぎの予定
          </div>
          <div className="mt-1 flex items-start gap-3">
            <h2 className="min-w-0 flex-1 text-[19px] leading-snug">{hero.title}</h2>
            {c && (
              <div className="shrink-0 pt-0.5 text-center">
                <div className="font-pop text-[26px] leading-none text-primary tabular-nums">
                  {c.n}
                </div>
                <div className="mt-0.5 text-[9.5px] font-extrabold text-muted">{c.u}</div>
              </div>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px] text-muted">
            {fmtDateTime(hero.startsAt)} – {fmtTime(hero.endsAt)} · {hero.venueName}
            {hero.status === "joined" ? (
              " · 参加登録済み"
            ) : (
              <Pill tone="info">招待あり</Pill>
            )}
          </div>
          <Link
            href={`/events/${hero.id}`}
            className="mt-2.5 block rounded-lg bg-primary px-3 py-2.5 text-center text-[13px] font-bold text-white"
          >
            詳細を見る
          </Link>
        </Card>
      ) : (
        <Card>
          <p className="text-center text-[12.5px] text-muted">
            今後の予定はありません。
            <Link href="/events" className="font-bold text-primary">
              イベントを作成
            </Link>
            しましょう。
          </p>
        </Card>
      )}

      {/* やること */}
      <div className="mx-0.5 mt-4 mb-2 flex items-baseline gap-1.5">
        <h3 className="text-[13px] font-bold text-muted">やること</h3>
        {taskCount > 0 && <span className="text-[11px] font-bold text-muted">{taskCount}件</span>}
      </div>
      {taskCount === 0 && (
        <Card className="py-3">
          <p className="text-center text-[12px] text-muted">やることはありません。</p>
        </Card>
      )}
      {pendingCount > 0 && (
        <TaskRow
          href="/expenses/approvals"
          icon={<IconMoney className="h-[18px] w-[18px] text-primary" />}
          iconBg="bg-primary-soft"
          title={`費用の承認 ${pendingCount}件`}
          sub={`あなたの負担予定 合計 ${yen(pendingTotal)}`}
          cta="承認する"
          solid
        />
      )}
      {invitedCount > 0 && (
        <TaskRow
          href="/events"
          icon={<IconMail className="h-[18px] w-[18px] text-violet" />}
          iconBg="bg-violet-soft"
          title={`イベントの招待 ${invitedCount}件`}
          sub="参加するか返事しましょう"
          cta="返事する"
          solid
        />
      )}
      {itemsLeft > 0 && (
        <TaskRow
          href="/items"
          icon={<IconCart className="h-[18px] w-[18px] text-ok" />}
          iconBg="bg-ok-soft"
          title={`買い出し 残り${itemsLeft}件`}
          sub={itemRows.map((i) => i.name).join(" · ")}
          cta="リストへ"
        />
      )}
      {pendingMembers > 0 && (
        <TaskRow
          href="/manage/members"
          icon={<IconUsers className="h-[18px] w-[18px] text-pend" />}
          iconBg="bg-pend-soft"
          title={`参加承認待ち ${pendingMembers}人`}
          sub="管理者のみ表示"
          cta="確認"
        />
      )}

      {/* この後の予定(横スクロール) */}
      {rest.length > 0 && (
        <>
          <div className="mx-0.5 mt-4 mb-2 flex items-baseline justify-between">
            <h3 className="text-[13px] font-bold text-muted">この後の予定</h3>
            <Link href="/events" className="text-[11px] font-bold text-primary">
              一覧へ ›
            </Link>
          </div>
          <div className="-mx-3.5 flex gap-2.5 overflow-x-auto px-3.5 pb-1.5">
            {rest.map((e) => (
              <Link
                key={e.id}
                href={`/events/${e.id}`}
                className="w-[136px] shrink-0 rounded-2xl border-2 border-line bg-white p-2.5 shadow-[3px_3px_0_var(--color-line)]"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-[10px] border-2 border-line ${
                    eventColorClass(e.color) ?? "bg-primary-soft text-primary"
                  }`}
                >
                  {e.icon ? (
                    <EventIcon icon={e.icon} className="h-4 w-4" />
                  ) : (
                    <IconCalendar className="h-4 w-4" />
                  )}
                </span>
                <div className="mt-2 truncate text-[12px] font-bold">{e.title}</div>
                <div className="mt-0.5 text-[10px] text-muted">{fmtDateTime(e.startsAt)}</div>
                <div className="truncate text-[10px] text-muted">{e.venueName}</div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* 管理者コンソール */}
      {isAdmin && (
        <Link href="/manage" className="mt-3 block">
          <Card className="flex items-center gap-3 py-2.5">
            <IconSettings className="h-5 w-5 text-primary" />
            <span className="flex-1 text-[13px] font-bold text-primary">管理者コンソール</span>
            <span className="text-muted">›</span>
          </Card>
        </Link>
      )}

      <AnnounceFab />
    </>
  );
}
