import Link from "next/link";
import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { ExpenseForm } from "@/components/expense-form";
import { IconBack } from "@/components/icons";
import { getApprovedMembers, requireTripContext } from "@/lib/session";

export default async function NewExpensePage() {
  const { user, trip, db } = await requireTripContext();
  const [members, events] = await Promise.all([
    getApprovedMembers(),
    db.query.events.findMany({
      where: eq(schema.events.tripId, trip.id),
      orderBy: (e, { asc }) => [asc(e.startsAt)],
    }),
  ]);

  return (
    <>
      <Link
        href="/expenses"
        className="flex items-center gap-1 pt-4 pb-1 text-[13px] font-bold text-primary"
      >
        <IconBack className="h-4 w-4" />
        費用一覧へ戻る
      </Link>
      <h1 className="text-xl font-bold">費用を追加</h1>
      <ExpenseForm
        members={members}
        events={events.map((e) => ({ id: e.id, title: e.title }))}
        selfId={user.id}
      />
    </>
  );
}
