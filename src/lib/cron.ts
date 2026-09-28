import "server-only";

// 毎分リマインドcronを動かす期間(JST)。旅会の開催期間に合わせて更新する。
// 期間外はDBに触れずに即returnし、Neonのcomputeを眠らせておく(CU時間の節約)。
// ※2026-09-28 運用終了に伴い vercel.json から毎分cronの登録自体を外した(Vercel Hobbyは
//   cronが1日1回まで)。次回使うときは Pro に戻したうえで vercel.json に
//   { "path": "/api/cron/reminders", "schedule": "* * * * *" } を再追加し、下の期間を更新する。
const REMINDER_WINDOW_FROM = new Date("2026-09-19T00:00:00+09:00");
const REMINDER_WINDOW_TO = new Date("2026-09-21T23:59:59+09:00");

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
