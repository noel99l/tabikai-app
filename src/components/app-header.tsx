import Link from "next/link";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { schema } from "@/db";
import { fmtDateTime } from "@/lib/format";
import { requireTripContext } from "@/lib/session";
import { NotificationBell } from "./notification-bell";
import { Avatar } from "./ui";

export async function AppHeader({ title }: { title: string }) {
  const { user, trip, db } = await requireTripContext();
  const [[row], latest] = await Promise.all([
    db
      .select({ value: count() })
      .from(schema.notifications)
      .where(
        and(
          eq(schema.notifications.tripId, trip.id),
          eq(schema.notifications.userId, user.id),
          isNull(schema.notifications.readAt),
        ),
      ),
    db.query.notifications.findMany({
      where: and(
        eq(schema.notifications.tripId, trip.id),
        eq(schema.notifications.userId, user.id),
      ),
      orderBy: [desc(schema.notifications.createdAt)],
      limit: 3,
    }),
  ]);
  const unread = row?.value ?? 0;

  return (
    <header className="flex items-center justify-between px-1 pt-3 pb-2.5">
      <h1 className="text-[19px] font-bold">{title}</h1>
      <div className="flex items-center gap-3">
        <NotificationBell
          unread={unread}
          latest={latest.map((n) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            link: n.link,
            createdLabel: fmtDateTime(n.createdAt),
            read: n.readAt !== null,
          }))}
        />
        <Link href="/settings" aria-label="アカウント">
          <Avatar name={user.name ?? "?"} size={30} />
        </Link>
      </div>
    </header>
  );
}
