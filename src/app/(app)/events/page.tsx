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
        hostId: schema.events.hostId,
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

  // 非表示会場(個室等)とプライバシー保護会場のイベントは、
  // 自分が関わるもの(主催/参加/招待)を除きサーバー側で除外する(タイトル等を配信しない)
  const isMine = (e: { id: string; hostId: string }) =>
    e.hostId === user.id ||
    participants.some(
      (p) =>
        p.eventId === e.id &&
        p.userId === user.id &&
        (p.status === "joined" || p.status === "invited"),
    );
  const visibleEvents = events.filter((e) => {
    const v = venues.find((x) => x.id === e.venueId);
    const open = (v?.showInSchedule ?? true) && !(v?.isPrivate ?? false);
    return open || isMine(e);
  });

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
        events={visibleEvents.map((e) => ({
          id: e.id,
          title: e.title,
          venueName: venueName(e.venueId),
          startsAt: e.startsAt,
          endsAt: e.endsAt,
          allDay: e.allDay,
          color: e.color,
          icon: e.icon,
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
