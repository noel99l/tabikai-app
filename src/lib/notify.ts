import type { Db } from "@/db";
import { schema } from "@/db";
import { sendPushToUsers } from "./push";

type NotifyInput = {
  type: (typeof schema.notificationType.enumValues)[number];
  title: string;
  body?: string;
  link?: string;
  senderId?: string;
};

// アプリ内お知らせを作成し、あわせてWebプッシュ通知を送信する
export async function notify(
  db: Db,
  tripId: string,
  userIds: string[],
  input: NotifyInput,
) {
  const targets = [...new Set(userIds)];
  if (targets.length === 0) return;
  await db.insert(schema.notifications).values(
    targets.map((userId) => ({
      tripId,
      userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      senderId: input.senderId ?? null,
    })),
  );
  // プッシュ送信は失敗してもお知らせ作成は成功扱いにする
  try {
    await sendPushToUsers(db, targets, {
      title: input.title,
      body: input.body,
      link: input.link,
    });
  } catch {
    // プッシュ基盤未設定・一時エラーは無視
  }
}
