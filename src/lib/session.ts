import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb, schema } from "@/db";

export const TRIP_COOKIE = "tripId";

export const requireUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
});

// アクティブな企画(Trip)のコンテキスト。承認済みメンバーであることを保証する。
export const requireTripContext = cache(async () => {
  const user = await requireUser();
  const store = await cookies();
  const tripId = store.get(TRIP_COOKIE)?.value;
  if (!tripId) redirect("/trips");
  const db = await getDb();
  const member = await db.query.tripMembers.findFirst({
    where: and(
      eq(schema.tripMembers.tripId, tripId),
      eq(schema.tripMembers.userId, user.id),
    ),
  });
  if (!member) redirect("/trips");
  if (member.status !== "approved") redirect("/trips/pending");
  const trip = await db.query.trips.findFirst({
    where: eq(schema.trips.id, tripId),
  });
  if (!trip) redirect("/trips");
  return { user, trip, member, db, isAdmin: member.role === "admin" };
});

// 承認済みメンバー一覧(ユーザー情報つき)
export const getApprovedMembers = cache(async () => {
  const { trip, db } = await requireTripContext();
  const rows = await db
    .select({
      userId: schema.tripMembers.userId,
      role: schema.tripMembers.role,
      name: schema.users.name,
      email: schema.users.email,
    })
    .from(schema.tripMembers)
    .innerJoin(schema.users, eq(schema.users.id, schema.tripMembers.userId))
    .where(
      and(
        eq(schema.tripMembers.tripId, trip.id),
        eq(schema.tripMembers.status, "approved"),
      ),
    );
  return rows;
});
