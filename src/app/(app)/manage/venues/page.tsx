import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { schema } from "@/db";
import { AppHeader } from "@/components/app-header";
import { IconBack } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { Card, SectionTitle, btnCls, inputCls, labelCls } from "@/components/ui";
import { SwitchButton } from "@/components/switch";
import { addVenue, deleteVenue, toggleVenueVisible } from "@/lib/actions/venues";
import { requireTripContext } from "@/lib/session";

export default async function VenuesPage() {
  const { trip, db, isAdmin } = await requireTripContext();
  if (!isAdmin) redirect("/");

  const venues = await db
    .select({
      id: schema.venues.id,
      name: schema.venues.name,
      capacity: schema.venues.capacity,
      openFrom: schema.venues.openFrom,
      openTo: schema.venues.openTo,
      showInSchedule: schema.venues.showInSchedule,
      eventCount: count(schema.events.id),
    })
    .from(schema.venues)
    .leftJoin(schema.events, eq(schema.events.venueId, schema.venues.id))
    .where(eq(schema.venues.tripId, trip.id))
    .groupBy(schema.venues.id)
    .orderBy(schema.venues.sortOrder);

  return (
    <>
      <AppHeader title="会場(部屋)管理" />
      <Link
        href="/manage"
        className="mb-2 flex items-center gap-1 text-[13px] font-bold text-primary"
      >
        <IconBack className="h-4 w-4" />
        管理者コンソールへ戻る
      </Link>
      <p className="mx-0.5 mb-3 text-[12.5px] text-muted">
        ここで作成した会場が予定表の列になります。
      </p>

      <SectionTitle>登録済みの会場({venues.length})</SectionTitle>
      {venues.length === 0 && (
        <p className="mx-0.5 mb-2 text-[12px] text-muted">
          会場がまだありません。下のフォームから追加してください。
        </p>
      )}
      {venues.map((v) => (
        <Card key={v.id} className="mb-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-bold">{v.name}</div>
              <div className="text-[11.5px] text-muted">
                {v.capacity ? `定員${v.capacity}人` : "定員 —"} ·{" "}
                {v.openFrom && v.openTo ? `${v.openFrom}–${v.openTo}` : "終日"} · イベント
                {v.eventCount}件
              </div>
            </div>
            {v.eventCount === 0 ? (
              <form action={deleteVenue.bind(null, v.id)}>
                <SubmitButton spinner={false} className="text-[12px] font-bold text-accent">
                  削除
                </SubmitButton>
              </form>
            ) : (
              <span className="text-[11px] text-muted">イベントあり</span>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
            <span className="text-[12px] text-muted">予定表にデフォルト表示</span>
            <form action={toggleVenueVisible.bind(null, v.id, !v.showInSchedule)}>
              <SwitchButton checked={v.showInSchedule} />
            </form>
          </div>
        </Card>
      ))}

      <SectionTitle>会場を追加</SectionTitle>
      <Card>
        <form action={addVenue}>
          <label className={labelCls} htmlFor="name">会場名</label>
          <input className={inputCls} id="name" name="name" required placeholder="大広間" />
          <label className={labelCls} htmlFor="capacity">定員(任意)</label>
          <input
            className={inputCls}
            id="capacity"
            name="capacity"
            inputMode="numeric"
            placeholder="30"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls} htmlFor="openFrom">利用開始(任意)</label>
              <input className={inputCls} id="openFrom" name="openFrom" type="time" />
            </div>
            <div>
              <label className={labelCls} htmlFor="openTo">利用終了(任意)</label>
              <input className={inputCls} id="openTo" name="openTo" type="time" />
            </div>
          </div>
          <label className="mt-3 flex items-center gap-2.5 text-[13px] font-semibold">
            <input
              type="checkbox"
              name="showInSchedule"
              defaultChecked
              className="h-5 w-5 accent-primary"
            />
            予定表にデフォルトで表示する
          </label>
          <SubmitButton className={`${btnCls} mt-4 w-full py-3`}>会場を追加</SubmitButton>
        </form>
      </Card>
    </>
  );
}
