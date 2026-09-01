import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { schema } from "@/db";
import { signOut } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { InstallPrompt } from "@/components/install-prompt";
import { ProfileEditButton } from "@/components/profile-edit";
import { PushToggle } from "@/components/push-toggle";
import { Avatar, Card, Pill } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { SwitchButton } from "@/components/switch";
import { resetMyNotifySettings, updateMyNotifySetting } from "@/lib/actions/trips";
import { NOTIFY_CATEGORIES } from "@/lib/notify";
import { fmtDateLabel } from "@/lib/format";
import { requireTripContext } from "@/lib/session";

export default async function SettingsPage() {
  const { user, trip, db, isAdmin } = await requireTripContext();
  // 本人の通知設定(未設定カテゴリは企画のデフォルトに従う)
  const member = await db.query.tripMembers.findFirst({
    where: and(
      eq(schema.tripMembers.tripId, trip.id),
      eq(schema.tripMembers.userId, user.id),
    ),
  });
  const myNs = member?.notifySettings ?? {};
  const tripNs = trip.notifySettings ?? {};
  const overridden = NOTIFY_CATEGORIES.some((c) => myNs[c.key] !== undefined);

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

      {/* 通知の種類(機能ごと)。初期値は管理者設定、変更は自分にだけ適用 */}
      <details className="mt-2.5 rounded-[14px] border-2 border-line bg-white p-3.5 shadow-[3px_3px_0_var(--color-line)]">
        <summary className="cursor-pointer text-sm font-bold">
          通知の種類(機能ごと)
          <span className="mt-0.5 block text-[11.5px] font-medium text-muted">
            初期値は管理者の設定です。変更すると自分にだけ適用されます。
          </span>
        </summary>
        {NOTIFY_CATEGORIES.map((c) => {
          const mine = myNs[c.key];
          const effective = mine ?? tripNs[c.key] ?? true;
          return (
            <div
              key={c.key}
              className="flex items-center justify-between gap-2 border-t border-line py-2.5 first-of-type:mt-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[13px] font-bold">
                  {c.label}
                  {mine !== undefined && (
                    <span className="shrink-0 rounded-full bg-violet-soft px-1.5 py-px text-[9px] font-bold text-violet">
                      自分の設定
                    </span>
                  )}
                </div>
                <div className="text-[10.5px] text-muted">{c.desc}</div>
              </div>
              <form action={updateMyNotifySetting.bind(null, c.key, !effective)}>
                <SwitchButton checked={effective} />
              </form>
            </div>
          );
        })}
        {overridden && (
          <form action={resetMyNotifySettings} className="mt-2.5 border-t border-line pt-2.5">
            <SubmitButton className="w-full rounded-[10px] border-2 border-line bg-white py-2.5 text-[12px] font-bold text-muted">
              すべて企画の初期設定に戻す
            </SubmitButton>
          </form>
        )}
      </details>

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
