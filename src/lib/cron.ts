import "server-only";

// Cronエンドポイントの認証。CRON_SECRET が設定されていれば Bearer で照合する。
// Vercel Cron は Authorization ヘッダに CRON_SECRET を自動付与する。
export function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production"; // 開発中は許可
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}
