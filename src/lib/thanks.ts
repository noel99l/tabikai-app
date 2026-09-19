// ありがとうポイントの共通ロジック(サーバー・クライアント共用)
export const THANKS_MESSAGE_MAX = 200;

// 受け取ったポイントを本人に見せてよいか(企画の終了後)
export function thanksRevealed(trip: { endsAt: Date }, now = new Date()) {
  return trip.endsAt.getTime() <= now.getTime();
}
