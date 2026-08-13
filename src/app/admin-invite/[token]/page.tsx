import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, schema } from "@/db";
import { IconUsers } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { btnCls } from "@/components/ui";
import { acceptAdminInvite } from "@/lib/actions/trips";
import { requireUser } from "@/lib/session";

// 管理者招待リンク: 承認済みメンバーが開くと管理者権限が付与される
export default async function AdminInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  await requireUser();
  const db = await getDb();
  const invite = await db.query.adminInvites.findFirst({
    where: eq(schema.adminInvites.token, token),
  });
  if (!invite) notFound();
  const trip = await db.query.trips.findFirst({
    where: eq(schema.trips.id, invite.tripId),
  });
  if (!trip) notFound();

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
        <IconUsers className="h-8 w-8 text-primary" />
      </span>
      <h1 className="mt-4 text-xl font-bold">管理者に追加</h1>
      <p className="mt-2 text-[13px] text-muted">
        「{trip.name}」の管理者になります。会場やイベント、精算などを管理できるようになります。
      </p>
      {invite.usedBy ? (
        <p className="mt-6 rounded-lg bg-line px-4 py-3 text-[13px] font-bold text-muted">
          この招待リンクは使用済みです。
        </p>
      ) : (
        <form action={acceptAdminInvite.bind(null, token)} className="mt-6 w-full">
          <SubmitButton className={`${btnCls} w-full py-3.5`}>
            管理者になる
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
