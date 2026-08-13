import Link from "next/link";
import { and, count, eq, isNull } from "drizzle-orm";
import { schema } from "@/db";
import { requireTripContext } from "@/lib/session";
import { IconBell } from "./icons";
import { Avatar } from "./ui";

export async function AppHeader({ title }: { title: string }) {
  const { user, trip, db } = await requireTripContext();
  const [row] = await db
    .select({ value: count() })
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.tripId, trip.id),
        eq(schema.notifications.userId, user.id),
        isNull(schema.notifications.readAt),
      ),
    );
  const unread = row?.value ?? 0;

  return (
    <header className="flex items-center justify-between px-1 pt-3 pb-2.5">
      <h1 className="text-[19px] font-bold">{title}</h1>
      <div className="flex items-center gap-3">
        <Link href="/notifications" aria-label="お知らせ" className="relative p-0.5">
          <IconBell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-accent px-1 text-[9.5px] font-extrabold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Link>
        <Link href="/settings" aria-label="アカウント">
          <Avatar name={user.name ?? "?"} size={30} />
        </Link>
      </div>
    </header>
  );
}
