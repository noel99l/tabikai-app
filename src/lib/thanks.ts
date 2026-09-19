// ありがとうポイントの共通ロジック(サーバー・クライアント共用)
export const THANKS_MESSAGE_MAX = 200;

// 送付の受付が終わっているか(企画の終了と同時に締め切り、手元に残ったポイントは消滅)
export function thanksClosed(trip: { endsAt: Date }, now = new Date()) {
  return trip.endsAt.getTime() <= now.getTime();
}

export const THANKS_CLOSED_MESSAGE =
  "企画は終了しました。手元に残ったポイントは消滅しています";

// ===== 手持ちのリセット(デイリー) =====
// 手持ちポイントは1日ぶんで、毎朝 THANKS_RESET_HOUR 時(JST)にリセットされる。
// 「その日」は 4:00 から翌 4:00 まで。使い切らなかった分は持ち越さず消滅する
export const THANKS_RESET_HOUR = 4;

// now が属する期間の開始時刻(直前の 4:00 JST)
export function thanksPeriodStart(now = new Date()): Date {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = jst.getUTCMonth();
  let d = jst.getUTCDate();
  if (jst.getUTCHours() < THANKS_RESET_HOUR) d -= 1; // 4:00 前は前日の期間
  return new Date(Date.UTC(y, m, d, THANKS_RESET_HOUR - 9, 0, 0));
}

// now が属する期間の終了時刻(次の 4:00 JST)
export function thanksPeriodEnd(now = new Date()): Date {
  return new Date(thanksPeriodStart(now).getTime() + 24 * 60 * 60 * 1000);
}
