import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb, schema } from "@/db";

export const TRIP_COOKIE = "tripId";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  avatarEmoji: string | null;
  onboardedAt: Date | null;
};

// セッション+DBのユーザー情報。onboarding未完了でも取得だけしたいとき用。
export const getSessionUser = cache(async (): Promise<AppUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;
  const db = await getDb();
  const u = await db.query.users.findFirst({
    where: eq(schema.users.id, session.user.id),
  });
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    image: u.image,
    avatarEmoji: u.avatarEmoji,
    onboardedAt: u.onboardedAt,
  };
});

// ログイン必須。表示名未設定なら /onboarding へ誘導する。
export const requireUser = cache(async (): Promise<AppUser> => {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.onboardedAt) redirect("/onboarding");
  return user;
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
      avatarEmoji: schema.users.avatarEmoji,
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
