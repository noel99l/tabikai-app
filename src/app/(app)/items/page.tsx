import Link from "next/link";
import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { AppHeader } from "@/components/app-header";
import { IconPlus } from "@/components/icons";
import { Card, Pill, SectionTitle, btnCls, btnGhostCls } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { claimItem, markItemDone } from "@/lib/actions/items";
import { getApprovedMembers, requireTripContext } from "@/lib/session";

export default async function ItemsPage() {
  const { trip, db, user } = await requireTripContext();
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

  const missing = items.filter((i) => !i.assigneeId && !i.done);
  const planned = items.filter((i) => i.assigneeId && !i.done);
  const ready = items.filter((i) => i.done);

  return (
    <>
      <AppHeader title="持ち物リスト" />
      <p className="mx-0.5 mb-2.5 text-[12.5px] text-muted">
        イベントに必要なものを全員で共有。足りないものは「買ってくる」で買い出しのついでに調達できます。
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
        <Card key={i.id} className="mb-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-bold">
                {i.name} <Pill tone="info">{eventOf(i.eventId)}</Pill>
              </div>
              <div className="text-[11.5px] text-muted">
                追加: {nameOf(i.addedBy)}
                {i.note ? ` · ${i.note}` : ""}
              </div>
            </div>
            <Pill tone="pend">未調達</Pill>
          </div>
          <div className="flex gap-2">
            <form action={claimItem.bind(null, i.id, "bring")} className="flex-1">
              <SubmitButton className={`${btnGhostCls} w-full py-1.5 text-xs`}>持っていく</SubmitButton>
            </form>
            <form action={claimItem.bind(null, i.id, "buy")} className="flex-1">
              <SubmitButton className={`${btnCls} w-full py-1.5 text-xs`}>買ってくる</SubmitButton>
            </form>
          </div>
        </Card>
      ))}
      {missing.length > 0 && (
        <p className="mx-0.5 text-[11px] text-muted">
          「買ってくる」で引き受けたものは調達予定にまとまり、購入後は費用入力からそのまま精算できます。
        </p>
      )}

      <SectionTitle>調達予定</SectionTitle>
      {planned.length === 0 && (
        <p className="mx-0.5 text-[12px] text-muted">調達予定のものはありません。</p>
      )}
      {planned.map((i) => (
        <Card key={i.id} className="mb-2.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-bold">
                {i.name} <Pill tone="violet">{eventOf(i.eventId)}</Pill>
              </div>
              <div className="text-[11.5px] text-muted">
                追加: {nameOf(i.addedBy)}
                {i.note ? ` · ${i.note}` : ""}
              </div>
            </div>
            <Pill tone="info">
              {nameOf(i.assigneeId)} が{i.method === "buy" ? "買い出し" : "持参"}
            </Pill>
          </div>
          {i.assigneeId === user.id && (
            <form action={markItemDone.bind(null, i.id)} className="mt-2">
              <SubmitButton className={`${btnGhostCls} w-full py-1.5 text-xs`}>
                準備OKにする
              </SubmitButton>
            </form>
          )}
        </Card>
      ))}

      <SectionTitle>準備OK</SectionTitle>
      {ready.map((i) => (
        <Card key={i.id} className="mb-2 flex items-center justify-between gap-2 opacity-60">
          <div>
            <div className="text-sm font-bold">
              {i.name} <Pill tone="violet">{eventOf(i.eventId)}</Pill>
            </div>
            <div className="text-[11.5px] text-muted">
              {nameOf(i.assigneeId)} が{i.method === "buy" ? "購入済み" : "持参済み"}
            </div>
          </div>
          <Pill tone="ok">準備OK</Pill>
        </Card>
      ))}

      <Link
        href="/items/new"
        aria-label="必要なものを追加"
        className="fixed right-4 bottom-24 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40"
      >
        <IconPlus className="h-6 w-6" strokeWidth={2.4} />
      </Link>
    </>
  );
}
