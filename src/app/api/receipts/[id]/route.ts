import { and, eq } from "drizzle-orm";
import { schema } from "@/db";
import { requireTripContext } from "@/lib/session";

export const dynamic = "force-dynamic";

// 領収書画像の配信。同じ企画の承認済みメンバーのみ閲覧できる。
// 画像は差し替え時に別IDで作り直すため、IDごとの内容は不変 → 長期キャッシュ可
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { trip, db } = await requireTripContext();
  const [row] = await db
    .select({ mime: schema.expenseReceipts.mime, bytes: schema.expenseReceipts.bytes })
    .from(schema.expenseReceipts)
    .where(
      and(eq(schema.expenseReceipts.id, id), eq(schema.expenseReceipts.tripId, trip.id)),
    )
    .limit(1);
  if (!row) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(row.bytes), {
    headers: {
      "Content-Type": row.mime,
      "Content-Length": String(row.bytes.byteLength),
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
