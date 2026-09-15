import "server-only";

// 毎分リマインドcronを動かす期間(JST)。旅会の開催期間に合わせて更新する。
// 期間外はDBに触れずに即returnし、Neonのcomputeを眠らせておく(CU時間の節約)。
// 開始直後(15:00ちょうど等)のイベントのリマインドは開始時刻に送られる点に注意。
const REMINDER_WINDOW_FROM = new Date("2026-09-19T15:00:00+09:00");
const REMINDER_WINDOW_TO = new Date("2026-09-21T12:00:00+09:00");

export function isWithinReminderWindow(now = new Date()): boolean {
  return now >= REMINDER_WINDOW_FROM && now <= REMINDER_WINDOW_TO;
}

// Cronエンドポイントの認証。CRON_SECRET が設定されていれば Bearer で照合する。
// Vercel Cron は Authorization ヘッダに CRON_SECRET を自動付与する。
export function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production"; // 開発中は許可
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}
