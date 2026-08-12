import type { Db } from "@/db";
import { schema } from "@/db";

type NotifyInput = {
  type: (typeof schema.notificationType.enumValues)[number];
  title: string;
  body?: string;
  link?: string;
  senderId?: string;
};

// アプリ内お知らせを作成する(プッシュ送信はフェーズ3でここに追加する)
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
}
