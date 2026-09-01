import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { schema } from "@/db";
import { sendPushToUsers } from "./push";

// 管理者が機能ごとにプッシュ通知をオン/オフできる区分。
// オフでもアプリ内のお知らせ(ベル)には常に残る。
export const NOTIFY_CATEGORIES = [
  { key: "event", label: "イベントの招待・変更", desc: "招待、参加者の追加/削除、時間変更、中止" },
  { key: "reminder", label: "イベントのリマインド", desc: "開始前の自動リマインド" },
  { key: "expense", label: "費用・承認・精算", desc: "割り勘の割り当て、確定、精算" },
  { key: "item", label: "買い出しリスト", desc: "引き受け・購入完了などの更新" },
  { key: "announce", label: "全体アナウンス", desc: "メンバーが送る全体アナウンス" },
  { key: "member", label: "参加申請・メンバー", desc: "参加リクエスト、承認、管理者付与" },
  { key: "nudge", label: "未承認の催促", desc: "24時間未承認の催促・エスカレーション" },
  { key: "comment", label: "イベントのコメント", desc: "参加イベントへの新しいコメント" },
] as const;

const TYPE_TO_CATEGORY: Record<string, (typeof NOTIFY_CATEGORIES)[number]["key"]> = {
  event_invite: "event",
  event_update: "event",
  event_reminder: "reminder",
  expense_assigned: "expense",
  expense_confirmed: "expense",
  settlement: "expense",
  item_update: "item",
  announce: "announce",
  member_request: "member",
  approval_nudge: "nudge",
  approval_escalation: "nudge",
  event_comment: "comment",
};

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
  // recordOnlyFor: お知らせ行だけ残す相手(既読扱い・プッシュなし)。
  // 送信者本人が自分のアナウンスを履歴で確認できるようにする用途
  opts?: { recordOnlyFor?: string[] },
) {
  const targets = [...new Set(userIds)];
  const recordOnly = [...new Set(opts?.recordOnlyFor ?? [])].filter(
    (id) => !targets.includes(id),
  );
  if (targets.length === 0 && recordOnly.length === 0) return;
  const now = new Date();
  await db.insert(schema.notifications).values(
    [
      ...targets.map((userId) => ({ userId, readAt: null as Date | null })),
      ...recordOnly.map((userId) => ({ userId, readAt: now as Date | null })),
    ].map(({ userId, readAt }) => ({
      tripId,
      userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      senderId: input.senderId ?? null,
      readAt,
    })),
  );
  if (targets.length === 0) return;
  // プッシュの可否をユーザーごとに解決する:
  // 本人の設定(trip_members) > 企画のデフォルト(trips・管理者設定) > オン
  let pushTargets = targets;
  const cat = TYPE_TO_CATEGORY[input.type];
  if (cat) {
    const rows = await db
      .select({
        userId: schema.tripMembers.userId,
        memberNs: schema.tripMembers.notifySettings,
        tripNs: schema.trips.notifySettings,
      })
      .from(schema.tripMembers)
      .innerJoin(schema.trips, eq(schema.trips.id, schema.tripMembers.tripId))
      .where(
        and(
          eq(schema.tripMembers.tripId, tripId),
          inArray(schema.tripMembers.userId, targets),
        ),
      );
    pushTargets = targets.filter((uid) => {
      const row = rows.find((r) => r.userId === uid);
      const mine = row?.memberNs?.[cat];
      if (mine !== undefined) return mine;
      const tripDefault = row?.tripNs?.[cat];
      if (tripDefault !== undefined) return tripDefault;
      return true;
    });
    if (pushTargets.length === 0) return;
  }
  // プッシュ送信は失敗してもお知らせ作成は成功扱いにする
  try {
    await sendPushToUsers(db, pushTargets, {
      title: input.title,
      body: input.body,
      link: input.link,
    });
  } catch {
    // プッシュ基盤未設定・一時エラーは無視
  }
}
