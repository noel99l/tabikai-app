import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { AppHeader } from "@/components/app-header";
import { ItemCreateFab } from "@/components/item-create";
import { ItemsBoard } from "@/components/items-board";
import { getApprovedMembers, requireTripContext } from "@/lib/session";

export default async function ItemsPage() {
  const { trip, db, user, isAdmin } = await requireTripContext();
  const [items, events, members] = await Promise.all([
    db.query.items.findMany({
      where: eq(schema.items.tripId, trip.id),
      orderBy: (i, { asc }) => [asc(i.sortOrder), asc(i.createdAt)],
    }),
    db.query.events.findMany({ where: eq(schema.events.tripId, trip.id) }),
    getApprovedMembers(),
  ]);
  const nameOf = (id: string | null) =>
    members.find((m) => m.userId === id)?.name ?? "";
  const eventOf = (id: string | null) =>
    events.find((e) => e.id === id)?.title ?? "全体";

  return (
    <>
      <AppHeader title="買い出しリスト" />
      <p className="mx-0.5 mb-2.5 text-[12.5px] text-muted">
        足りないものを掲載して、持参か買い出しで調達。買い物中は「買い出しリスト」が便利です。
      </p>

      <ItemsBoard
        items={items.map((i) => ({
          id: i.id,
          name: i.name,
          note: i.note,
          eventTitle: eventOf(i.eventId),
          addedByName: nameOf(i.addedBy),
          assigneeId: i.assigneeId,
          assigneeName: i.assigneeId ? nameOf(i.assigneeId) : null,
          method: i.method,
          status: i.done ? "ready" : i.assigneeId ? "planned" : "missing",
          canDelete: i.addedBy === user.id || isAdmin,
        }))}
        selfId={user.id}
        selfName={user.name}
      />

      <ItemCreateFab
        events={events
          .slice()
          .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
          .map((e) => ({ id: e.id, title: e.title }))}
      />
    </>
  );
}
