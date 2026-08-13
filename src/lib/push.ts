import "server-only";
import { inArray } from "drizzle-orm";
import webpush from "web-push";
import type { Db } from "@/db";
import { schema } from "@/db";

let configured = false;

// VAPIDキーが揃っていればweb-pushを初期化(未設定なら送信をスキップ)
function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body?: string;
  link?: string;
};

// 指定ユーザー群の全購読へプッシュ送信。失効(404/410)した購読は削除する。
export async function sendPushToUsers(
  db: Db,
  userIds: string[],
  payload: PushPayload,
): Promise<void> {
  if (!ensureConfigured()) return;
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return;

  const subs = await db.query.pushSubscriptions.findMany({
    where: inArray(schema.pushSubscriptions.userId, ids),
  });
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);
  const expired: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) expired.push(s.endpoint);
        // それ以外の一時エラーは無視(次回配信で再送される想定)
      }
    }),
  );

  if (expired.length > 0) {
    await db
      .delete(schema.pushSubscriptions)
      .where(inArray(schema.pushSubscriptions.endpoint, expired));
  }
}
