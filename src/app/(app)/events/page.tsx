import { eq, inArray } from "drizzle-orm";
import { schema } from "@/db";
import { AppHeader } from "@/components/app-header";
import { EventsList } from "@/components/events-list";
import { fmtDateLabel, jstDateKey } from "@/lib/format";
import { getApprovedMembers, requireTripContext } from "@/lib/session";

// イベント: 開始時間順のリスト+メンバービュー(グリッドは「予定表」タブ)
export default async function EventsPage() {
  const { user, trip, db } = await requireTripContext();

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
      })
      .from(schema.events)
      .where(eq(schema.events.tripId, trip.id)),
  ]);
  const participants = events.length
    ? await db
        .select({
          eventId: schema.eventParticipants.eventId,
          userId: schema.eventParticipants.userId,
          status: schema.eventParticipants.status,
        })
        .from(schema.eventParticipants)
        .where(
          inArray(
            schema.eventParticipants.eventId,
            events.map((e) => e.id),
          ),
        )
    : [];

  const venueName = (id: string) => venues.find((v) => v.id === id)?.name ?? "";
  // 予定表でデフォルト非表示の会場(個室・お風呂など)のイベントは一覧に出さない
  const venueShown = (id: string) => venues.find((v) => v.id === id)?.showInSchedule ?? true;

  // 旅程から日付タブを生成(予定表と同じロジック)
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
      <AppHeader title="イベント" />
      <EventsList
        events={events.map((e) => ({
          id: e.id,
          title: e.title,
          venueName: venueName(e.venueId),
          startsAt: e.startsAt,
          endsAt: e.endsAt,
          allDay: e.allDay,
          color: e.color,
          icon: e.icon,
          venueShown: venueShown(e.venueId),
          participants: participants.filter((p) => p.eventId === e.id),
        }))}
        members={members.map((m) => ({ userId: m.userId, name: m.name ?? "?" }))}
        venues={venues.map((v) => ({ id: v.id, name: v.name }))}
        days={days}
        selfId={user.id}
      />
    </>
  );
}
