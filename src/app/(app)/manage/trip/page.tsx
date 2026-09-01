import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { IconBack } from "@/components/icons";
import { LogoUpload } from "@/components/logo-upload";
import { SubmitButton } from "@/components/submit-button";
import { Card, SectionTitle, btnCls, inputCls, labelCls } from "@/components/ui";
import { SwitchButton } from "@/components/switch";
import {
  updateNotifySetting,
  updateReminderMinutes,
  updateTripDates,
  updateTripName,
} from "@/lib/actions/trips";
import { NOTIFY_CATEGORIES } from "@/lib/notify";
import { jstDateKey, fmtTime } from "@/lib/format";
import { requireTripContext } from "@/lib/session";

export default async function TripSettingsPage() {
  const { trip, isAdmin } = await requireTripContext();
  if (!isAdmin) redirect("/home");

  return (
    <>
      <AppHeader title="旅程・企画設定" />
      <Link
        href="/manage"
        className="mb-2 flex items-center gap-1 text-[13px] font-bold text-primary"
      >
        <IconBack className="h-4 w-4" />
        管理者コンソールへ戻る
      </Link>

      <SectionTitle>イベントロゴ</SectionTitle>
      <Card>
        <LogoUpload logoUrl={trip.logoUrl} />
      </Card>

      <SectionTitle>企画名</SectionTitle>
      <Card>
        <form action={updateTripName} className="flex gap-2">
          <input className={inputCls} name="name" defaultValue={trip.name} required />
          <SubmitButton className={`${btnCls} shrink-0`}>保存</SubmitButton>
        </form>
      </Card>

      <SectionTitle>リマインド通知</SectionTitle>
      <Card>
        <p className="mb-2 text-[11.5px] text-muted">
          参加登録者に、イベント開始の何分前に通知するかの既定値です(各自オフ可)。
        </p>
        <form action={updateReminderMinutes} className="flex items-center gap-2">
          <span className="shrink-0 text-[13px] whitespace-nowrap text-muted">開始</span>
          {/* inputCls(w-full)を使うとw-20が上書きされ全幅になるため専用クラスにする */}
          <input
            className="w-20 shrink-0 rounded-[10px] border-2 border-line bg-white px-2 py-2.5 text-center text-sm"
            name="reminderMinutes"
            type="number"
            min={0}
            max={1440}
            defaultValue={trip.reminderMinutes}
            required
          />
          <span className="shrink-0 text-[13px] whitespace-nowrap text-muted">分前</span>
          <SubmitButton className={`${btnCls} ml-auto shrink-0`}>保存</SubmitButton>
        </form>
      </Card>

      <SectionTitle>プッシュ通知(機能ごと)</SectionTitle>
      <Card>
        <p className="mb-1 text-[11.5px] text-muted">
          オフにした機能はプッシュ通知を送りません(ベルのお知らせには残ります)。ここでの設定はメンバーごとの初期値で、各メンバーはアカウント画面から自分用に変更できます。
        </p>
        {NOTIFY_CATEGORIES.map((c) => {
          const enabled = trip.notifySettings?.[c.key] !== false;
          return (
            <div
              key={c.key}
              className="flex items-center justify-between gap-2 border-t border-line py-2.5 first:border-t-0 last:pb-0"
            >
              <div className="min-w-0">
                <div className="text-[13px] font-bold">{c.label}</div>
                <div className="text-[10.5px] text-muted">{c.desc}</div>
              </div>
              <form action={updateNotifySetting.bind(null, c.key, !enabled)}>
                <SwitchButton checked={enabled} />
              </form>
            </div>
          );
        })}
      </Card>

      <SectionTitle>旅程(開始・終了日時)</SectionTitle>
      <Card>
        <p className="mb-2 text-[11.5px] text-muted">
          この範囲で予定表の日付タブが自動生成されます。
        </p>
        <form action={updateTripDates}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls} htmlFor="startDate">開始日</label>
              <input
                className={inputCls}
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={jstDateKey(trip.startsAt)}
                required
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="startTime">開始時刻</label>
              <input
                className={inputCls}
                id="startTime"
                name="startTime"
                type="time"
                defaultValue={fmtTime(trip.startsAt)}
                required
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="endDate">終了日</label>
              <input
                className={inputCls}
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={jstDateKey(trip.endsAt)}
                required
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="endTime">終了時刻</label>
              <input
                className={inputCls}
                id="endTime"
                name="endTime"
                type="time"
                defaultValue={fmtTime(trip.endsAt)}
                required
              />
            </div>
          </div>
          <SubmitButton className={`${btnCls} mt-4 w-full py-3`}>旅程を保存</SubmitButton>
        </form>
      </Card>
    </>
  );
}
