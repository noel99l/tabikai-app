import { and, eq, gt, inArray, isNull, lte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { isAuthorizedCron } from "@/lib/cron";
import { fmtTime } from "@/lib/format";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";

// イベント開始のリマインド(リアルタイム)。
// Vercel Pro の毎分cronで実行し、「開始まで残り reminderMinutes 分以内」に
// 入った時間指定イベントを参加登録者へ通知する。各イベントは一度だけ送信。
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = await getDb();
  const now = new Date();
  // cron停止などで取りこぼした場合でも、開始5分後までは遅れて送る
  const graceEnd = new Date(now.getTime() - 5 * 60 * 1000);

  // 「now >= startsAt - reminderMinutes」かつ「開始から5分以内 or 未開始」の未送信イベント
  const candidates = await db
    .select({
      id: schema.events.id,
      title: schema.events.title,
      startsAt: schema.events.startsAt,
      tripId: schema.events.tripId,
      venueId: schema.events.venueId,
      reminderMinutes: schema.trips.reminderMinutes,
    })
    .from(schema.events)
    .innerJoin(schema.trips, eq(schema.trips.id, schema.events.tripId))
    .where(
      and(
        eq(schema.events.allDay, false),
        isNull(schema.events.reminderSentAt),
        gt(schema.events.startsAt, graceEnd),
        // startsAt - reminderMinutes*60秒 <= now
        lte(
          sql`${schema.events.startsAt} - make_interval(mins => ${schema.trips.reminderMinutes})`,
          now,
        ),
      ),
    );
  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, events: 0, notified: 0 });
  }

  // 毎分cronの重複起動に備え、送信対象を原子的に確保する
  const claimed = await db
    .update(schema.events)
    .set({ reminderSentAt: now })
    .where(
      and(
        inArray(
          schema.events.id,
          candidates.map((c) => c.id),
        ),
        isNull(schema.events.reminderSentAt),
      ),
    )
    .returning({ id: schema.events.id });
  const claimedIds = new Set(claimed.map((c) => c.id));

  let sent = 0;
  for (const e of candidates) {
    if (!claimedIds.has(e.id)) continue;
    // 参加登録済みかつリマインドをオフにしていない人
    const [parts, venue] = await Promise.all([
      db.query.eventParticipants.findMany({
        where: and(
          eq(schema.eventParticipants.eventId, e.id),
          eq(schema.eventParticipants.status, "joined"),
          eq(schema.eventParticipants.remindOptOut, false),
        ),
      }),
      db.query.venues.findFirst({ where: eq(schema.venues.id, e.venueId) }),
    ]);
    const userIds = parts.map((p) => p.userId);
    if (userIds.length > 0) {
      await notify(db, e.tripId, userIds, {
        type: "event_reminder",
        title: `まもなく「${e.title}」`,
        body: `${fmtTime(e.startsAt)} 開始 · ${venue?.name ?? ""}`,
        link: `/events/${e.id}`,
      });
      sent += userIds.length;
    }
  }

  return NextResponse.json({ ok: true, events: claimed.length, notified: sent });
}
