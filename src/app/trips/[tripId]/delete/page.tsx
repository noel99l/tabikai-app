import Link from "next/link";
import { and, count, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { IconBack } from "@/components/icons";
import { Card } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { deleteTrip } from "@/lib/actions/trips";
import { fmtDateLabel } from "@/lib/format";
import { requireUser } from "@/lib/session";

// 企画の削除確認(管理者のみ)
export default async function DeleteTripPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const user = await requireUser();
  const db = await getDb();
  const trip = await db.query.trips.findFirst({
    where: eq(schema.trips.id, tripId),
  });
  if (!trip) notFound();
  const member = await db.query.tripMembers.findFirst({
    where: and(
      eq(schema.tripMembers.tripId, tripId),
      eq(schema.tripMembers.userId, user.id),
    ),
  });
  if (!member || member.role !== "admin") redirect("/trips");

  const [members] = await db
    .select({ value: count() })
    .from(schema.tripMembers)
    .where(eq(schema.tripMembers.tripId, tripId));
  const [events] = await db
    .select({ value: count() })
    .from(schema.events)
    .where(eq(schema.events.tripId, tripId));
  const [expenses] = await db
    .select({ value: count() })
    .from(schema.expenses)
    .where(eq(schema.expenses.tripId, tripId));

  return (
    <div className="mx-auto min-h-dvh max-w-md px-4">
      <Link
        href="/trips"
        className="flex items-center gap-1 pt-4 pb-1 text-[13px] font-bold text-primary"
      >
        <IconBack className="h-4 w-4" />
        イベント選択へ戻る
      </Link>
      <h1 className="text-xl font-bold">企画の削除</h1>
      <Card className="mt-3 border-accent">
        <p className="text-sm font-bold">「{trip.name}」を削除しますか?</p>
        <p className="mt-1 text-[12.5px] text-muted">
          {fmtDateLabel(trip.startsAt)} – {fmtDateLabel(trip.endsAt)} · メンバー
          {members.value}人
        </p>
        <p className="mt-2 rounded-lg bg-accent-soft px-3 py-2 text-[12px] font-bold text-accent">
          イベント{events.value}件・費用{expenses.value}件・持ち物・お知らせを含む
          すべてのデータが完全に削除されます。この操作は取り消せません。
        </p>
        <form action={deleteTrip.bind(null, tripId)} className="mt-3">
          <SubmitButton className="w-full rounded-lg bg-accent px-4 py-3 text-[13.5px] font-bold text-white">
            完全に削除する
          </SubmitButton>
        </form>
        <Link
          href="/trips"
          className="mt-2 block text-center text-[13px] font-bold text-muted"
        >
          キャンセル
        </Link>
      </Card>
    </div>
  );
}
