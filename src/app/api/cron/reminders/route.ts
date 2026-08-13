import { and, eq, gt, isNull, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { isAuthorizedCron } from "@/lib/cron";
import { fmtDateTime } from "@/lib/format";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";

// 今後24時間以内に始まる時間指定イベントを、参加登録者へまとめてリマインドする。
// Vercel Free プランの制約で 1日1回(朝)実行のため、「開始5分前」ではなく
// 「これから始まる予定のまとめ通知」として動作する。各イベントは一度だけ送信。
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = await getDb();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24時間先まで

  // 未送信・これから24時間以内に始まる時間指定イベント
  const candidates = await db
    .select({
      id: schema.events.id,
      title: schema.events.title,
      startsAt: schema.events.startsAt,
      tripId: schema.events.tripId,
    })
    .from(schema.events)
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
        body: `${fmtDateTime(e.startsAt)} に開始します`,
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
