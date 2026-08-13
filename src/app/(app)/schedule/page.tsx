import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { schema } from "@/db";
import { AppHeader } from "@/components/app-header";
import { ScheduleGrid } from "@/components/schedule-grid";
import { fmtDateLabel, jstDateKey, jstMinutes } from "@/lib/format";
import { getApprovedMembers, requireTripContext } from "@/lib/session";

// 予定表: 列=会場 × 行=時間帯(Teams風)。日付タブはURLクエリ ?day=
export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const { user, trip, db } = await requireTripContext();
  const { day } = await searchParams;

  // 旅行日程(管理者設定)から日付タブを生成
  const days: { key: string; label: string }[] = [];
  for (
    let t = new Date(trip.startsAt);
    days.length < 14;
    t = new Date(t.getTime() + 86400000)
  ) {
    days.push({ key: jstDateKey(t), label: fmtDateLabel(t) });
    if (jstDateKey(t) === jstDateKey(trip.endsAt)) break;
  }
  const todayKey = jstDateKey(new Date());
  const defaultIdx = Math.max(0, days.findIndex((d) => d.key === todayKey));
  const dayIdx = Math.min(days.length - 1, Number(day ?? defaultIdx) || 0);
  const activeDay = days[dayIdx];

  const [venues, members] = await Promise.all([
    db.query.venues.findMany({
      where: eq(schema.venues.tripId, trip.id),
      orderBy: (v, { asc }) => [asc(v.sortOrder)],
    }),
    getApprovedMembers(),
  ]);

  const events = await db
    .select({
      id: schema.events.id,
      title: schema.events.title,
      venueId: schema.events.venueId,
      startsAt: schema.events.startsAt,
      endsAt: schema.events.endsAt,
      allDay: schema.events.allDay,
      joined: count(schema.eventParticipants.userId),
    })
    .from(schema.events)
    .leftJoin(
      schema.eventParticipants,
      eq(schema.eventParticipants.eventId, schema.events.id),
    )
    .where(eq(schema.events.tripId, trip.id))
    .groupBy(schema.events.id);

  // アクティブ日の 0:00(JST)を基準に、日をまたぐイベントも当日分にクリップして表示
  const dayStartMs = activeDay
    ? new Date(`${activeDay.key}T00:00:00+09:00`).getTime()
    : 0;
  const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;
  const minutesFromDayStart = (t: Date) => Math.round((t.getTime() - dayStartMs) / 60000);

  const intersectsDay = (e: (typeof events)[number]) =>
    e.startsAt.getTime() < dayEndMs && e.endsAt.getTime() > dayStartMs;

  // 終日イベント(当日に重なるもの)は上部の終日帯へ
  const allDayEvents = events.filter((e) => e.allDay && intersectsDay(e));
  const dayEvents = events
    .filter((e) => !e.allDay && intersectsDay(e))
    .map((e) => ({
      ...e,
      clippedStartMin: Math.max(0, minutesFromDayStart(e.startsAt)),
      clippedEndMin: Math.min(1440, minutesFromDayStart(e.endsAt)),
      continuesBefore: e.startsAt.getTime() < dayStartMs,
      continuesAfter: e.endsAt.getTime() > dayEndMs,
    }));

  // 表示時間帯: 日をまたぐ企画は24時間表示。日帰りは 8:00–22:00(イベントに合わせ拡張)
  const isMultiDay = jstDateKey(trip.startsAt) !== jstDateKey(trip.endsAt);
  let startHour = 0;
  let endHour = 24;
  if (!isMultiDay) {
    startHour = 8;
    endHour = 22;
    for (const e of dayEvents) {
      startHour = Math.min(startHour, Math.floor(e.clippedStartMin / 60));
      endHour = Math.max(endHour, Math.ceil(e.clippedEndMin / 60));
    }
  }

  // 予約可能な時間帯: 企画の開始前・終了後はグレーアウトして予約不可
  const isFirstDay = activeDay?.key === jstDateKey(trip.startsAt);
  const isLastDay = activeDay?.key === jstDateKey(trip.endsAt);
  const bookableStartMin = isFirstDay ? jstMinutes(trip.startsAt) : startHour * 60;
  const bookableEndMin = isLastDay ? jstMinutes(trip.endsAt) : endHour * 60;

  return (
    <>
      <AppHeader title="予定表" />

      {/* スクロール時も日付タブを上部に固定 */}
      <div className="sticky top-0 z-20 -mx-3.5 mb-2.5 flex gap-1.5 overflow-x-auto bg-screen px-3.5 pb-1.5 pt-1">
        {days.map((d, i) => (
          <Link
            key={d.key}
            href={`/schedule?day=${i}`}
            className={`flex-1 rounded-[10px] border px-3 py-2 text-center text-[12.5px] font-semibold whitespace-nowrap ${
              i === dayIdx
                ? "border-primary bg-primary text-white"
                : "border-line bg-white text-muted"
            }`}
          >
            {d.label}
          </Link>
        ))}
      </div>

      {venues.length === 0 ? (
        <p className="rounded-xl border border-line bg-white p-4 text-center text-[12.5px] text-muted">
          会場が未登録です。管理者コンソールの「会場(部屋)管理」から追加してください。
        </p>
      ) : (
        <ScheduleGrid
          venues={venues.map((v) => ({
            id: v.id,
            name: v.name,
            defaultShow: v.showInSchedule,
          }))}
          events={dayEvents.map((e) => ({
            id: e.id,
            title: e.title,
            venueId: e.venueId,
            startMin: e.clippedStartMin,
            endMin: e.clippedEndMin,
            joined: e.joined,
            continuesBefore: e.continuesBefore,
            continuesAfter: e.continuesAfter,
          }))}
          allDayEvents={allDayEvents.map((e) => ({
            id: e.id,
            title: e.title,
            venueId: e.venueId,
          }))}
          dayKey={activeDay?.key ?? days[0].key}
          startHour={startHour}
          endHour={endHour}
          bookableStartMin={bookableStartMin}
          bookableEndMin={bookableEndMin}
          days={days}
          members={members}
          selfId={user.id}
        />
      )}
    </>
  );
}
