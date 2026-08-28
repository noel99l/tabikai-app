import Link from "next/link";
import { Suspense } from "react";
import { and, desc, eq, sql } from "drizzle-orm";
import { schema } from "@/db";
import { fmtDateTime } from "@/lib/format";
import { requireTripContext } from "@/lib/session";
import { NotificationBell } from "./notification-bell";
import { Avatar } from "./ui";

// タイトルは即時描画し、通知ベル+アバター(DBアクセスあり)はSuspenseで
// ストリーミングする。ページ本文のクリティカルパスからヘッダーのクエリを外す。
export function AppHeader({
  title,
  leading,
}: {
  title: string;
  leading?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-3 px-1 pt-3 pb-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        {leading}
        <h1 className="truncate text-[19px] font-bold">{title}</h1>
      </div>
      <Suspense
        fallback={
          <div className="flex items-center gap-3">
            <span className="h-6 w-6 animate-pulse rounded-full bg-ink/10" />
            <span className="h-[30px] w-[30px] animate-pulse rounded-full bg-ink/10" />
          </div>
        }
      >
        <HeaderIcons />
      </Suspense>
    </header>
  );
}

async function HeaderIcons() {
  const { user, trip, db } = await requireTripContext();
  // 直近3件と未読数を1クエリで取得(未読数はスカラサブクエリ)
  const latest = await db
    .select({
      id: schema.notifications.id,
      title: schema.notifications.title,
      body: schema.notifications.body,
      link: schema.notifications.link,
      createdAt: schema.notifications.createdAt,
      readAt: schema.notifications.readAt,
      unread: sql<number>`(
        select count(*) from ${schema.notifications} n2
        where n2.trip_id = ${trip.id}
          and n2.user_id = ${user.id}
          and n2.read_at is null
      )`,
    })
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.tripId, trip.id),
        eq(schema.notifications.userId, user.id),
      ),
    )
    .orderBy(desc(schema.notifications.createdAt))
    .limit(3);
  const unread = Number(latest[0]?.unread ?? 0);

  return (
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
        <Avatar name={user.name ?? "?"} emoji={user.avatarEmoji} size={30} />
      </Link>
    </div>
  );
}
