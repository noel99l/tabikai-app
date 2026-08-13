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
      joined: count(schema.eventParticipants.userId),
    })
    .from(schema.events)
    .leftJoin(
      schema.eventParticipants,
      eq(schema.eventParticipants.eventId, schema.events.id),
    )
    .where(eq(schema.events.tripId, trip.id))
    .groupBy(schema.events.id);

  const dayEvents = events.filter((e) => jstDateKey(e.startsAt) === activeDay?.key);

  // 表示時間帯: 日をまたぐ企画は24時間表示。日帰りは 8:00–22:00(イベントに合わせ拡張)
  const isMultiDay = jstDateKey(trip.startsAt) !== jstDateKey(trip.endsAt);
  let startHour = 0;
  let endHour = 24;
  if (!isMultiDay) {
    startHour = 8;
    endHour = 22;
    for (const e of dayEvents) {
      startHour = Math.min(startHour, Math.floor(jstMinutes(e.startsAt) / 60));
      endHour = Math.max(endHour, Math.ceil(jstMinutes(e.endsAt) / 60));
    }
  }

  return (
    <>
      <AppHeader title="予定表" />

      <div className="mb-2.5 flex gap-1.5 overflow-x-auto">
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
          venues={venues.map((v) => ({ id: v.id, name: v.name }))}
          events={dayEvents.map((e) => ({
            id: e.id,
            title: e.title,
            venueId: e.venueId,
            startMin: jstMinutes(e.startsAt),
            endMin: jstMinutes(e.endsAt),
            joined: e.joined,
          }))}
          dayKey={activeDay?.key ?? days[0].key}
          dayLabel={activeDay?.label ?? days[0].label}
          startHour={startHour}
          endHour={endHour}
          days={days}
          members={members}
          selfId={user.id}
        />
      )}
    </>
  );
}
