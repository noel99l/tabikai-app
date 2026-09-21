import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { schema } from "@/db";
import { AdminInvite } from "@/components/admin-invite";
import { GrantAdminButton } from "@/components/grant-admin-button";
import { AppHeader } from "@/components/app-header";
import { IconBack } from "@/components/icons";
import { Avatar, Card, Pill, SectionTitle } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { SwitchButton } from "@/components/switch";
import { approveMember, setAutoApprove, setExcludeFromSplitAll } from "@/lib/actions/trips";
import { RecalcSplitAllButton } from "@/components/recalc-split-all";
import { RemoveMemberButton } from "@/components/remove-member-button";
import { requireTripContext } from "@/lib/session";

// メンバー参加承認(管理者のみ)。PC管理画面はフェーズ4で拡張予定。
export default async function MembersPage() {
  const { trip, db, isAdmin } = await requireTripContext();
  if (!isAdmin) redirect("/home");

  const rows = await db
    .select({
      userId: schema.tripMembers.userId,
      status: schema.tripMembers.status,
      role: schema.tripMembers.role,
      excludeFromSplitAll: schema.tripMembers.excludeFromSplitAll,
      name: schema.users.name,
      email: schema.users.email,
      avatarEmoji: schema.users.avatarEmoji,
      avatarImage: schema.users.avatarImage,
    })
    .from(schema.tripMembers)
    .innerJoin(schema.users, eq(schema.users.id, schema.tripMembers.userId))
    .where(eq(schema.tripMembers.tripId, trip.id));

  const pending = rows.filter((r) => r.status === "pending");
  const approved = rows.filter((r) => r.status === "approved");
  const excludedCount = approved.filter((r) => r.excludeFromSplitAll).length;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;
  const inviteUrl = `${origin}/join/${trip.id}`;

  return (
    <>
      <AppHeader title="メンバー管理" />
      <Link
        href="/manage"
        className="mb-2 flex items-center gap-1 text-[13px] font-bold text-primary"
      >
        <IconBack className="h-4 w-4" />
        管理者コンソールへ戻る
      </Link>

      <Card>
        <h3 className="text-sm font-bold">招待リンク</h3>
        <p className="mt-1 mb-2 text-[11.5px] text-muted">
          このURLを共有すると、Googleログイン後に参加リクエストが届きます。
        </p>
        <p className="rounded-lg bg-screen px-2.5 py-2 text-[11.5px] break-all select-all">
          {inviteUrl}
        </p>
        <form
          action={setAutoApprove.bind(null, !trip.autoApprove)}
          className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3"
        >
          <span>
            <span className="block text-[13px] font-bold">自動承認モード</span>
            <span className="block text-[11.5px] text-muted">
              オンの間は参加リクエストを承認なしで即メンバーにします。
            </span>
          </span>
          <SwitchButton checked={trip.autoApprove} />
        </form>
      </Card>

      <Card className="mt-2.5">
        <AdminInvite origin={origin} />
      </Card>

      <SectionTitle>参加承認待ち({pending.length})</SectionTitle>
      {pending.length === 0 && (
        <p className="mx-0.5 text-[12px] text-muted">承認待ちのリクエストはありません。</p>
      )}
      {pending.map((m) => (
        <Card key={m.userId} className="mb-2.5">
          <div className="flex items-center gap-3">
            <Avatar name={m.name} emoji={m.avatarEmoji} image={m.avatarImage} size={34} />
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
      <p className="mx-0.5 -mt-1 mb-1 text-[11.5px] text-muted">
        「外す」でメンバーから除外できます(管理者は除外できません)。費用やポイントの記録は残ります。
      </p>
      <p className="mx-0.5 -mt-1 mb-2 text-[11.5px] text-muted">
        「全員割り勘の対象」をオフにしたメンバーは「全員で割り勘」の費用に含まれません(子ども・ゲストなど)。
        切り替えると登録済みの全員割り勘もそのメンバー分を割り直します。個別に選択する割り勘には影響しません。
        {excludedCount > 0 && (
          <span className="font-bold"> 現在 {excludedCount} 人が対象外です。</span>
        )}
      </p>
      {trip.expensesClosedAt ? (
        <p className="mx-0.5 mb-2 rounded-lg bg-pend-soft px-2.5 py-1.5 text-[11.5px] font-bold text-pend">
          精算を締めているため、対象の切り替えはできません(締めを解除すると変更できます)。
        </p>
      ) : (
        <RecalcSplitAllButton />
      )}
      {approved.map((m) => (
        <Card key={m.userId} className="mb-2 py-2.5">
          <div className="flex items-center gap-3">
            <Avatar name={m.name} emoji={m.avatarEmoji} image={m.avatarImage} size={30} />
            <div className="min-w-0 flex-1">
              <span className="text-[13.5px] font-bold">{m.name}</span>
              {m.excludeFromSplitAll && (
                <span className="ml-1.5 align-middle">
                  <Pill tone="violet">全員割り勘の対象外</Pill>
                </span>
              )}
            </div>
            {m.role === "admin" ? (
              <Pill tone="info">管理者</Pill>
            ) : (
              <span className="flex shrink-0 items-center gap-1.5">
                <GrantAdminButton userId={m.userId} name={m.name} />
                <RemoveMemberButton userId={m.userId} name={m.name} />
              </span>
            )}
          </div>
          {!trip.expensesClosedAt && (
            <form
              action={setExcludeFromSplitAll.bind(null, m.userId, !m.excludeFromSplitAll)}
              className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-2"
            >
              <span className="text-[12px] text-muted">
                全員割り勘の対象{m.excludeFromSplitAll ? "(オフ: 含めない)" : "(オン: 含める)"}
              </span>
              <SwitchButton checked={!m.excludeFromSplitAll} />
            </form>
          )}
        </Card>
      ))}
    </>
  );
}
