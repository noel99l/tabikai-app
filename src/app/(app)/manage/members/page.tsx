import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { schema } from "@/db";
import { AppHeader } from "@/components/app-header";
import { IconBack } from "@/components/icons";
import { Avatar, Card, Pill, SectionTitle } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { approveMember } from "@/lib/actions/trips";
import { requireTripContext } from "@/lib/session";

// メンバー参加承認(管理者のみ)。PC管理画面はフェーズ4で拡張予定。
export default async function MembersPage() {
  const { trip, db, isAdmin } = await requireTripContext();
  if (!isAdmin) redirect("/");

  const rows = await db
    .select({
      userId: schema.tripMembers.userId,
      status: schema.tripMembers.status,
      role: schema.tripMembers.role,
      name: schema.users.name,
      email: schema.users.email,
    })
    .from(schema.tripMembers)
    .innerJoin(schema.users, eq(schema.users.id, schema.tripMembers.userId))
    .where(eq(schema.tripMembers.tripId, trip.id));

  const pending = rows.filter((r) => r.status === "pending");
  const approved = rows.filter((r) => r.status === "approved");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const inviteUrl = `${proto}://${host}/join/${trip.id}`;

  return (
    <>
      <AppHeader title="メンバー管理" />
      <Link
        href="/"
        className="mb-2 flex items-center gap-1 text-[13px] font-bold text-primary"
      >
        <IconBack className="h-4 w-4" />
        ホームへ戻る
      </Link>

      <Card>
        <h3 className="text-sm font-bold">招待リンク</h3>
        <p className="mt-1 mb-2 text-[11.5px] text-muted">
          このURLを共有すると、Googleログイン後に参加リクエストが届きます。
        </p>
        <p className="rounded-lg bg-screen px-2.5 py-2 text-[11.5px] break-all select-all">
          {inviteUrl}
        </p>
      </Card>

      <SectionTitle>参加承認待ち({pending.length})</SectionTitle>
      {pending.length === 0 && (
        <p className="mx-0.5 text-[12px] text-muted">承認待ちのリクエストはありません。</p>
      )}
      {pending.map((m) => (
        <Card key={m.userId} className="mb-2.5">
          <div className="flex items-center gap-3">
            <Avatar name={m.name} size={34} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">{m.name}</div>
              <div className="truncate text-[11.5px] text-muted">{m.email}</div>
            </div>
          </div>
          <form action={approveMember} className="mt-2.5 flex gap-2">
            <input type="hidden" name="userId" value={m.userId} />
            <SubmitButton
              name="action"
              value="approve"
              className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white"
            >
              承認
            </SubmitButton>
            <SubmitButton
              name="action"
              value="reject"
              className="flex-1 rounded-lg bg-accent-soft px-3 py-2 text-xs font-bold text-accent"
            >
              拒否
            </SubmitButton>
          </form>
        </Card>
      ))}

      <SectionTitle>メンバー({approved.length})</SectionTitle>
      {approved.map((m) => (
        <Card key={m.userId} className="mb-2 flex items-center gap-3 py-2.5">
          <Avatar name={m.name} size={30} />
          <div className="min-w-0 flex-1">
            <span className="text-[13.5px] font-bold">{m.name}</span>
          </div>
          {m.role === "admin" && <Pill tone="info">管理者</Pill>}
        </Card>
      ))}
    </>
  );
}
