import { and, eq, gt, isNull, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { isAuthorizedCron } from "@/lib/cron";
import { fmtTime } from "@/lib/format";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";

// イベント開始の trip.reminderMinutes 分前に、参加登録者へリマインドを送る。
// Vercel Cron から定期実行する想定(数分おき)。
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = await getDb();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 60 * 60 * 1000); // 先読み最大60分

  // 未送信・未来・60分以内に始まる時間指定イベント(+trip.reminderMinutes)
  const candidates = await db
    .select({
      id: schema.events.id,
      title: schema.events.title,
      startsAt: schema.events.startsAt,
      tripId: schema.events.tripId,
      reminderMinutes: schema.trips.reminderMinutes,
    })
    .from(schema.events)
    .innerJoin(schema.trips, eq(schema.trips.id, schema.events.tripId))
    .where(
      and(
        eq(schema.events.allDay, false),
        isNull(schema.events.reminderSentAt),
        gt(schema.events.startsAt, now),
        lte(schema.events.startsAt, windowEnd),
      ),
    );

  let sent = 0;
  for (const e of candidates) {
    // 開始 reminderMinutes 分前に達しているか
    const dueAt = e.startsAt.getTime() - e.reminderMinutes * 60 * 1000;
    if (now.getTime() < dueAt) continue;

    // 参加登録済みかつリマインドをオフにしていない人
    const parts = await db.query.eventParticipants.findMany({
      where: and(
        eq(schema.eventParticipants.eventId, e.id),
        eq(schema.eventParticipants.status, "joined"),
        eq(schema.eventParticipants.remindOptOut, false),
      ),
    });
    const userIds = parts.map((p) => p.userId);
    if (userIds.length > 0) {
      await notify(db, e.tripId, userIds, {
        type: "event_reminder",
        title: `まもなく「${e.title}」`,
        body: `${fmtTime(e.startsAt)} に開始します`,
        link: `/events/${e.id}`,
      });
      sent += userIds.length;
    }
    await db
      .update(schema.events)
      .set({ reminderSentAt: now })
      .where(eq(schema.events.id, e.id));
  }

  return NextResponse.json({ ok: true, events: candidates.length, notified: sent });
}
