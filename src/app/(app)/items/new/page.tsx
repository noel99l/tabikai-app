import Link from "next/link";
import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { IconBack } from "@/components/icons";
import { btnCls, inputCls, labelCls } from "@/components/ui";
import { addItem } from "@/lib/actions/items";
import { requireTripContext } from "@/lib/session";

export default async function NewItemPage() {
  const { trip, db } = await requireTripContext();
  const events = await db.query.events.findMany({
    where: eq(schema.events.tripId, trip.id),
    orderBy: (e, { asc }) => [asc(e.startsAt)],
  });

  return (
    <>
      <Link
        href="/items"
        className="flex items-center gap-1 pt-4 pb-1 text-[13px] font-bold text-primary"
      >
        <IconBack className="h-4 w-4" />
        持ち物リストへ戻る
      </Link>
      <h1 className="text-xl font-bold">必要なものを追加</h1>
      <form action={addItem}>
        <label className={labelCls} htmlFor="name">品名</label>
        <input className={inputCls} id="name" name="name" required placeholder="炭(3kg)" />
        <label className={labelCls} htmlFor="note">数量・補足(任意)</label>
        <input className={inputCls} id="note" name="note" placeholder="30人分 など" />
        <label className={labelCls} htmlFor="eventId">関連イベント(任意)</label>
        <select className={inputCls} id="eventId" name="eventId" defaultValue="">
          <option value="">全体(特定イベントなし)</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </select>
        <button className={`${btnCls} mt-5 w-full py-3.5`}>追加する</button>
      </form>
    </>
  );
}
