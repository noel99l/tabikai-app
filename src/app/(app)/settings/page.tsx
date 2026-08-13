import Link from "next/link";
import { signOut } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { Avatar, Card, Pill } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { fmtDateLabel } from "@/lib/format";
import { requireTripContext } from "@/lib/session";

export default async function SettingsPage() {
  const { user, trip, isAdmin } = await requireTripContext();

  return (
    <>
      <AppHeader title="アカウント" />

      <Card className="flex items-center gap-3.5">
        <Avatar name={user.name ?? "?"} size={44} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold">{user.name}</div>
          <div className="truncate text-[12px] text-muted">{user.email}</div>
        </div>
        {isAdmin && <Pill tone="info">管理者</Pill>}
      </Card>

      <Card className="mt-2.5">
        <div className="text-[11px] text-muted">参加中のイベント</div>
        <div className="mt-0.5 text-sm font-bold">{trip.name}</div>
        <div className="text-[11.5px] text-muted">
          {fmtDateLabel(trip.startsAt)} – {fmtDateLabel(trip.endsAt)}
        </div>
        <div className="mt-2.5 flex flex-col gap-2">
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
              メンバー管理・招待リンク
            </Link>
          )}
        </div>
      </Card>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
        className="mt-4"
      >
        <SubmitButton className="w-full rounded-lg border border-line bg-white px-4 py-3 text-[13.5px] font-bold text-accent">
          ログアウト
        </SubmitButton>
      </form>
    </>
  );
}
