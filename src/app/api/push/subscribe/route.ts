import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getSessionUser } from "@/lib/session";

// クライアントのPushSubscriptionを保存(同一エンドポイントは所有者を更新)
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sub = await req.json().catch(() => null);
  const endpoint = sub?.endpoint as string | undefined;
  const p256dh = sub?.keys?.p256dh as string | undefined;
  const auth = sub?.keys?.auth as string | undefined;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
  }

  const db = await getDb();
  await db
    .insert(schema.pushSubscriptions)
    .values({ userId: user.id, endpoint, p256dh, auth })
    .onConflictDoUpdate({
      target: schema.pushSubscriptions.endpoint,
      set: { userId: user.id, p256dh, auth },
    });

  return NextResponse.json({ ok: true });
}
