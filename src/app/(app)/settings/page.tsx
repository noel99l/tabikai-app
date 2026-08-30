import Link from "next/link";
import { signOut } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { InstallPrompt } from "@/components/install-prompt";
import { ProfileEditButton } from "@/components/profile-edit";
import { PushToggle } from "@/components/push-toggle";
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
        <Avatar name={user.name ?? "?"} emoji={user.avatarEmoji} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold">{user.name}</span>
            {isAdmin && <Pill tone="info">管理者</Pill>}
          </div>
          <div className="truncate text-[12px] text-muted">{user.email}</div>
        </div>
        <ProfileEditButton name={user.name} emoji={user.avatarEmoji} />
      </Card>

      <PushToggle />

      {/* ホームのバナーを閉じた後でも、ここからいつでも追加手順を見られる */}
      <InstallPrompt mode="card" />

      <Card className="mt-2.5">
        <div className="text-[11px] text-muted">参加中のイベント</div>
        <div className="mt-0.5 text-sm font-bold">{trip.name}</div>
        <div className="text-[11.5px] text-muted">
          {fmtDateLabel(trip.startsAt)} – {fmtDateLabel(trip.endsAt)}
        </div>
        <div className="mt-2.5 flex flex-col gap-2">
          <Link
            href="/members"
            className="rounded-lg bg-primary-soft px-3 py-2.5 text-center text-[13px] font-bold text-primary"
          >
            メンバー一覧を見る
          </Link>
          <Link
            href="/trips"
            className="rounded-lg bg-primary-soft px-3 py-2.5 text-center text-[13px] font-bold text-primary"
          >
            イベントを切り替え
          </Link>
          {isAdmin && (
            <Link
              href="/manage"
              className="rounded-lg bg-primary-soft px-3 py-2.5 text-center text-[13px] font-bold text-primary"
            >
              管理者コンソール
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
        <SubmitButton className="w-full rounded-[12px] border-2 border-line bg-white px-4 py-3 text-[13.5px] font-bold text-accent shadow-[3px_3px_0_var(--color-line)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
          ログアウト
        </SubmitButton>
      </form>
    </>
  );
}
