import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { schema } from "@/db";
import { AppHeader } from "@/components/app-header";
import { IconBack } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { VenueRow } from "@/components/venue-row";
import { Card, SectionTitle, btnCls, inputCls, labelCls } from "@/components/ui";
import { addVenue } from "@/lib/actions/venues";
import { requireTripContext } from "@/lib/session";

export default async function VenuesPage() {
  const { trip, db, isAdmin } = await requireTripContext();
  if (!isAdmin) redirect("/home");

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
        <VenueRow key={v.id} venue={v} />
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
