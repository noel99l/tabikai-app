// ありがとうポイントの共通ロジック(サーバー・クライアント共用)
export const THANKS_MESSAGE_MAX = 200;

// 送付の受付が終わっているか(企画の終了と同時に締め切り、手元に残ったポイントは消滅)
export function thanksClosed(trip: { endsAt: Date }, now = new Date()) {
  return trip.endsAt.getTime() <= now.getTime();
}

export const THANKS_CLOSED_MESSAGE =
  "企画は終了しました。手元に残ったポイントは消滅しています";
