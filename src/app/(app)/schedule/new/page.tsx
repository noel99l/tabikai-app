import Link from "next/link";
import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { EventForm } from "@/components/event-form";
import { IconBack } from "@/components/icons";
import { fmtDateLabel, jstDateKey } from "@/lib/format";
import { getApprovedMembers, requireTripContext } from "@/lib/session";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ venueId?: string; date?: string; start?: string; end?: string }>;
}) {
  const { user, trip, db } = await requireTripContext();
  const defaults = await searchParams;
  const venues = await db.query.venues.findMany({
    where: eq(schema.venues.tripId, trip.id),
    orderBy: (v, { asc }) => [asc(v.sortOrder)],
  });
  const members = await getApprovedMembers();

  const days: { key: string; label: string }[] = [];
  for (
    let t = new Date(trip.startsAt);
    days.length < 14;
    t = new Date(t.getTime() + 86400000)
  ) {
    days.push({ key: jstDateKey(t), label: fmtDateLabel(t) });
    if (jstDateKey(t) === jstDateKey(trip.endsAt)) break;
  }

  return (
    <>
      <Link
        href="/schedule"
        className="flex items-center gap-1 pt-4 pb-1 text-[13px] font-bold text-primary"
      >
        <IconBack className="h-4 w-4" />
        予定表へ戻る
      </Link>
      <h1 className="text-xl font-bold">イベントを作成</h1>
      <EventForm
        venues={venues}
        days={days}
        members={members}
        selfId={user.id}
        defaults={defaults}
      />
    </>
  );
}
