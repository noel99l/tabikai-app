import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, schema } from "@/db";
import { IconSuitcase } from "@/components/icons";
import { btnCls } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { requestJoin, selectTrip } from "@/lib/actions/trips";
import { fmtDateLabel } from "@/lib/format";
import { requireUser } from "@/lib/session";

// 招待リンク: ログイン → 参加リクエスト → 管理者承認待ち
export default async function JoinPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  // 未ログイン・初回設定を経由しても招待リンクへ戻ってこられるようにする
  const user = await requireUser(`/join/${tripId}`);
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

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-primary-soft">
        <IconSuitcase className="h-9 w-9 text-primary" />
      </span>
      <h1 className="mt-4 text-xl font-bold">{trip.name}</h1>
      <p className="mt-1 text-[13px] text-muted">
        {fmtDateLabel(trip.startsAt)} – {fmtDateLabel(trip.endsAt)}
      </p>
      <p className="mt-4 text-[13px] text-muted">
        {trip.autoApprove
          ? `${user.name} さん(${user.email})として参加します。参加後すぐに利用を開始できます。`
          : `${user.name} さん(${user.email})として参加をリクエストします。管理者が承認すると利用を開始できます。`}
      </p>
      {member ? (
        <form action={selectTrip.bind(null, tripId)} className="mt-6 w-full">
          <SubmitButton className={`${btnCls} w-full py-3.5`}>
            {member.status === "approved" ? "アプリを開く" : "承認状況を確認"}
          </SubmitButton>
        </form>
      ) : (
        <form action={requestJoin.bind(null, tripId)} className="mt-6 w-full">
          <SubmitButton className={`${btnCls} w-full py-3.5`}>
            {trip.autoApprove ? "参加する" : "参加をリクエストする"}
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
