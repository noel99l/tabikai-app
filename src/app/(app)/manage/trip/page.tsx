import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { IconBack } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { Card, SectionTitle, btnCls, inputCls, labelCls } from "@/components/ui";
import { updateTripDates, updateTripName } from "@/lib/actions/trips";
import { jstDateKey, fmtTime } from "@/lib/format";
import { requireTripContext } from "@/lib/session";

export default async function TripSettingsPage() {
  const { trip, isAdmin } = await requireTripContext();
  if (!isAdmin) redirect("/");

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

      <SectionTitle>企画名</SectionTitle>
      <Card>
        <form action={updateTripName} className="flex gap-2">
          <input className={inputCls} name="name" defaultValue={trip.name} required />
          <SubmitButton className={`${btnCls} shrink-0`}>保存</SubmitButton>
        </form>
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
