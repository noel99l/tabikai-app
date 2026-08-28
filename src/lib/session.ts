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

// アプリ内パスのみ許可する(オープンリダイレクト防止)
export function safeNext(raw: string | undefined | null, fallback: string) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : fallback;
}

// ログイン必須。表示名未設定なら /onboarding へ誘導する。
// next を渡すと、ログイン・初回設定をまたいでも最後にそのパスへ戻れる
// (招待リンク /join/[tripId] などで使用)。
export const requireUser = cache(async (next?: string): Promise<AppUser> => {
  const user = await getSessionUser();
  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  if (!user) redirect(`/login${q}`);
  if (!user.onboardedAt) redirect(`/onboarding${q}`);
  return user;
});

// アクティブな企画(Trip)のコンテキスト。承認済みメンバーであることを保証する。
// ユーザー・メンバーシップ・企画を1クエリで取得し、DB往復を最小化する。
export const requireTripContext = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const store = await cookies();
  const tripId = store.get(TRIP_COOKIE)?.value;
  if (!tripId) redirect("/trips");
  const db = await getDb();
  const [row] = await db
    .select({
      user: schema.users,
      member: schema.tripMembers,
      trip: schema.trips,
    })
    .from(schema.users)
    .leftJoin(
      schema.tripMembers,
      and(
        eq(schema.tripMembers.tripId, tripId),
        eq(schema.tripMembers.userId, schema.users.id),
      ),
    )
    .leftJoin(schema.trips, eq(schema.trips.id, tripId))
    .where(eq(schema.users.id, session.user.id))
    .limit(1);
  if (!row) redirect("/login");
  if (!row.user.onboardedAt) redirect("/onboarding");
  if (!row.member || !row.trip) redirect("/trips");
  if (row.member.status !== "approved") redirect("/trips/pending");
  const user: AppUser = {
    id: row.user.id,
    email: row.user.email,
    name: row.user.name,
    image: row.user.image,
    avatarEmoji: row.user.avatarEmoji,
    onboardedAt: row.user.onboardedAt,
  };
  return {
    user,
    trip: row.trip,
    member: row.member,
    db,
    isAdmin: row.member.role === "admin",
  };
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
