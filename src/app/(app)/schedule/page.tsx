import { count, eq, sql } from "drizzle-orm";
import { schema } from "@/db";
import { AppHeader } from "@/components/app-header";
import { ScheduleView } from "@/components/schedule-view";
import { fmtDateLabel, jstDateKey } from "@/lib/format";
import { getApprovedMembers, requireTripContext } from "@/lib/session";

// 予定表: 全日分のデータを一括で渡し、日付切替はクライアントで即時に行う
export default async function SchedulePage() {
  const { user, trip, db, isAdmin } = await requireTripContext();

  const [venues, members, events] = await Promise.all([
    db.query.venues.findMany({
      where: eq(schema.venues.tripId, trip.id),
      orderBy: (v, { asc }) => [asc(v.sortOrder)],
    }),
    getApprovedMembers(),
    db
      .select({
        id: schema.events.id,
        title: schema.events.title,
        venueId: schema.events.venueId,
        startsAt: schema.events.startsAt,
        endsAt: schema.events.endsAt,
        allDay: schema.events.allDay,
        color: schema.events.color,
        icon: schema.events.icon,
        hostId: schema.events.hostId,
        joined: count(schema.eventParticipants.userId),
        // 自分が参加登録済みか(別クエリを往復させず集約で判定)
        mine: sql<boolean>`coalesce(bool_or(${schema.eventParticipants.userId} = ${user.id} and ${schema.eventParticipants.status} = 'joined'), false)`,
      })
      .from(schema.events)
      .leftJoin(
        schema.eventParticipants,
        eq(schema.eventParticipants.eventId, schema.events.id),
      )
      .where(eq(schema.events.tripId, trip.id))
      .groupBy(schema.events.id),
  ]);

  // 旅程から日付タブを生成
  const days: { key: string; label: string }[] = [];
  for (
    let t = new Date(trip.startsAt);
    days.length < 14;
    t = new Date(t.getTime() + 86400000)
  ) {
    days.push({ key: jstDateKey(t), label: fmtDateLabel(t) });
    if (jstDateKey(t) === jstDateKey(trip.endsAt)) break;
  }

  return (
    <>
      <AppHeader title="予定表" />

      {venues.length === 0 ? (
        <p className="rounded-[14px] border-2 border-line bg-white p-4 text-center shadow-[3px_3px_0_var(--color-line)] text-[12.5px] text-muted">
          会場が未登録です。管理者コンソールの「会場(部屋)管理」から追加してください。
        </p>
      ) : (
        <ScheduleView
          days={days}
          venues={venues.map((v) => ({
            id: v.id,
            name: v.name,
            defaultShow: v.showInSchedule,
          }))}
          events={events.map((e) => ({
            id: e.id,
            title: e.title,
            venueId: e.venueId,
            startMs: e.startsAt.getTime(),
            endMs: e.endsAt.getTime(),
            allDay: e.allDay,
            color: e.color,
            icon: e.icon,
            joined: e.joined,
            mine: e.mine,
            canManage: e.hostId === user.id || isAdmin,
          }))}
          tripStartMs={trip.startsAt.getTime()}
          tripEndMs={trip.endsAt.getTime()}
          isMultiDay={jstDateKey(trip.startsAt) !== jstDateKey(trip.endsAt)}
          members={members.map((m) => ({ userId: m.userId, name: m.name }))}
          selfId={user.id}
        />
      )}
    </>
  );
}
