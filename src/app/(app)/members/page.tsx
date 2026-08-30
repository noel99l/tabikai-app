import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Avatar, Card, Pill } from "@/components/ui";
import { fmtDateLabel } from "@/lib/format";
import { getApprovedMembers, requireTripContext } from "@/lib/session";

// 企画の参加者一覧(全メンバーが閲覧できる)
export default async function MembersPage() {
  const { user, trip, isAdmin } = await requireTripContext();
  const members = await getApprovedMembers();

  return (
    <>
      <AppHeader title="メンバー" />

      <Card className="mb-3">
        <div className="text-[11px] text-muted">参加中のイベント</div>
        <div className="mt-0.5 text-sm font-bold">{trip.name}</div>
        <div className="text-[11.5px] text-muted">
          {fmtDateLabel(trip.startsAt)} – {fmtDateLabel(trip.endsAt)} · 参加{members.length}人
        </div>
      </Card>

      {members.map((m) => (
        <Card key={m.userId} className="mb-2 flex items-center gap-3 py-2.5">
          <Avatar name={m.name ?? "?"} emoji={m.avatarEmoji} size={38} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[13.5px] font-bold">
              <span className="truncate">{m.name}</span>
              {m.userId === user.id && (
                <span className="shrink-0 text-[10.5px] font-bold text-muted">(自分)</span>
              )}
            </div>
          </div>
          {m.role === "admin" && <Pill tone="info">管理者</Pill>}
        </Card>
      ))}

      <div className="mt-4 flex flex-col gap-2">
        <Link
          href="/trips"
          className="rounded-lg bg-primary-soft px-3 py-2.5 text-center text-[13px] font-bold text-primary"
        >
          イベントを切り替え
        </Link>
        {isAdmin && (
          <Link
            href="/manage/members"
            className="rounded-lg bg-primary-soft px-3 py-2.5 text-center text-[13px] font-bold text-primary"
          >
            メンバー管理(招待・承認)へ
          </Link>
        )}
      </div>
    </>
  );
}
