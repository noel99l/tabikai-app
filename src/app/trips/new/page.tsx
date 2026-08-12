import Link from "next/link";
import { IconBack } from "@/components/icons";
import { btnCls, inputCls, labelCls } from "@/components/ui";
import { createTrip } from "@/lib/actions/trips";
import { requireUser } from "@/lib/session";

export default async function NewTripPage() {
  await requireUser();
  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pb-10">
      <Link
        href="/trips"
        className="flex items-center gap-1 pt-4 pb-1 text-[13px] font-bold text-primary"
      >
        <IconBack className="h-4 w-4" />
        イベント選択へ戻る
      </Link>
      <h1 className="text-xl font-bold">新しいイベントを作成</h1>
      <p className="mt-1 mb-2 text-[12.5px] text-muted">
        作成したユーザーが管理者になります。作成後、招待リンクをメンバーに共有してください。
      </p>
      <form action={createTrip}>
        <label className={labelCls} htmlFor="name">イベント名</label>
        <input className={inputCls} id="name" name="name" required placeholder="突然の旅会2026" />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls} htmlFor="startDate">開始日</label>
            <input className={inputCls} id="startDate" name="startDate" type="date" required />
          </div>
          <div>
            <label className={labelCls} htmlFor="startTime">開始時刻</label>
            <input className={inputCls} id="startTime" name="startTime" type="time" defaultValue="15:00" required />
          </div>
          <div>
            <label className={labelCls} htmlFor="endDate">終了日</label>
            <input className={inputCls} id="endDate" name="endDate" type="date" required />
          </div>
          <div>
            <label className={labelCls} htmlFor="endTime">終了時刻</label>
            <input className={inputCls} id="endTime" name="endTime" type="time" defaultValue="12:00" required />
          </div>
        </div>
        <label className={labelCls} htmlFor="venues">会場(カンマ区切り・後から管理画面で編集可)</label>
        <input
          className={inputCls}
          id="venues"
          name="venues"
          placeholder="大広間, カラオケルーム, BBQガーデン, ロビー"
        />
        <button className={`${btnCls} mt-5 w-full py-3.5`}>作成する</button>
      </form>
    </div>
  );
}
