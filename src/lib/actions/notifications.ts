"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { schema } from "@/db";
import { notify } from "@/lib/notify";
import { sendPushToUsers } from "@/lib/push";
import { getApprovedMembers, requireTripContext } from "@/lib/session";

// 個別のお知らせを既読にする(ベルのモーダルでタップしたとき)
export async function markNotificationRead(id: string) {
  const { user, db } = await requireTripContext();
  await db
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(schema.notifications.id, id),
        eq(schema.notifications.userId, user.id),
        isNull(schema.notifications.readAt),
      ),
    );
  revalidatePath("/", "layout");
}

export async function markAllRead() {
  const { user, trip, db } = await requireTripContext();
  await db
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(schema.notifications.tripId, trip.id),
        eq(schema.notifications.userId, user.id),
        isNull(schema.notifications.readAt),
      ),
    );
  revalidatePath("/", "layout");
}

// 自分の端末へのテスト通知(プッシュ設定の到達確認用)
export async function sendTestPush(): Promise<{ subs: number }> {
  const { user, db } = await requireTripContext();
  const subs = await db.query.pushSubscriptions.findMany({
    where: eq(schema.pushSubscriptions.userId, user.id),
  });
  if (subs.length > 0) {
    await sendPushToUsers(db, [user.id], {
      title: "テスト通知",
      body: "この通知が見えていれば、プッシュ通知の設定は正常です。",
      link: "/settings",
    });
  }
  return { subs: subs.length };
}

// 全体アナウンス(一般メンバーも送信可能)
export async function sendAnnouncement(formData: FormData) {
  const { user, trip, db } = await requireTripContext();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) throw new Error("メッセージを入力してください");
  const members = await getApprovedMembers();
  await notify(
    db,
    trip.id,
    members.map((m) => m.userId).filter((id) => id !== user.id),
    {
      type: "announce",
      title: body.length > 40 ? `${body.slice(0, 40)}…` : body,
      body: `${user.name} さんより`,
      link: "/notifications",
      senderId: user.id,
    },
    // 自分が送ったアナウンスも自分のお知らせに残す(既読扱い・プッシュなし)
    { recordOnlyFor: [user.id] },
  );
  revalidatePath("/notifications");
}
