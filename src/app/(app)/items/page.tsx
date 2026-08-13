import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { AppHeader } from "@/components/app-header";
import { ItemCreateFab } from "@/components/item-create";
import { ItemRow } from "@/components/item-row";
import { Card, SectionTitle } from "@/components/ui";
import { getApprovedMembers, requireTripContext } from "@/lib/session";

export default async function ItemsPage() {
  const { trip, db, user, isAdmin } = await requireTripContext();
  const [items, events, members] = await Promise.all([
    db.query.items.findMany({
      where: eq(schema.items.tripId, trip.id),
      orderBy: (i, { asc }) => [asc(i.createdAt)],
    }),
    db.query.events.findMany({ where: eq(schema.events.tripId, trip.id) }),
    getApprovedMembers(),
  ]);
  const nameOf = (id: string | null) =>
    members.find((m) => m.userId === id)?.name ?? "";
  const eventOf = (id: string | null) =>
    events.find((e) => e.id === id)?.title ?? "全体";

  const statusOf = (i: (typeof items)[number]) =>
    i.done ? "ready" : i.assigneeId ? "planned" : "missing";
  const missing = items.filter((i) => !i.assigneeId && !i.done);
  const planned = items.filter((i) => i.assigneeId && !i.done);
  const ready = items.filter((i) => i.done);

  const toProps = (i: (typeof items)[number]) => ({
    item: {
      id: i.id,
      name: i.name,
      note: i.note,
      eventTitle: eventOf(i.eventId),
      addedByName: nameOf(i.addedBy),
      assigneeName: i.assigneeId ? nameOf(i.assigneeId) : null,
      method: i.method,
      status: statusOf(i) as "missing" | "planned" | "ready",
    },
    canDelete: i.addedBy === user.id || isAdmin,
  });

  return (
    <>
      <AppHeader title="持ち物リスト" />
      <p className="mx-0.5 mb-2.5 text-[12.5px] text-muted">
        イベントに必要なものを全員で共有。各項目をタップするとステータスを切り替えられます。
      </p>

      <div className="mb-3 grid grid-cols-3 gap-2">
        {[
          { label: "足りない", value: missing.length, cls: "text-pend" },
          { label: "調達予定", value: planned.length, cls: "" },
          { label: "準備OK", value: ready.length, cls: "text-ok" },
        ].map((s) => (
          <Card key={s.label} className="p-3">
            <div className="text-[11px] text-muted">{s.label}</div>
            <div className={`text-xl font-extrabold ${s.cls}`}>{s.value}</div>
          </Card>
        ))}
      </div>

      <h3 className="mx-0.5 mt-3.5 mb-2 text-[13px] font-bold text-pend">足りないもの</h3>
      {missing.length === 0 && (
        <p className="mx-0.5 text-[12px] text-muted">足りないものはありません。</p>
      )}
      {missing.map((i) => (
        <ItemRow key={i.id} {...toProps(i)} />
      ))}
      {missing.length > 0 && (
        <p className="mx-0.5 text-[11px] text-muted">
          項目をタップして「持っていく/買ってくる」を選ぶと調達予定に移り、購入分は費用入力から精算できます。
        </p>
      )}

      <SectionTitle>調達予定</SectionTitle>
      {planned.length === 0 && (
        <p className="mx-0.5 text-[12px] text-muted">調達予定のものはありません。</p>
      )}
      {planned.map((i) => (
        <ItemRow key={i.id} {...toProps(i)} />
      ))}

      <SectionTitle>準備OK</SectionTitle>
      {ready.length === 0 && (
        <p className="mx-0.5 text-[12px] text-muted">準備OKのものはありません。</p>
      )}
      {ready.map((i) => (
        <ItemRow key={i.id} {...toProps(i)} />
      ))}

      <ItemCreateFab
        events={events
          .slice()
          .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
          .map((e) => ({ id: e.id, title: e.title }))}
      />
    </>
  );
}
