"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { jstDate } from "@/lib/format";
import { notify } from "@/lib/notify";
import { requireTripContext, requireUser, TRIP_COOKIE } from "@/lib/session";

async function setTripCookie(tripId: string) {
  (await cookies()).set(TRIP_COOKIE, tripId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function selectTrip(tripId: string) {
  const user = await requireUser();
  const db = await getDb();
  const member = await db.query.tripMembers.findFirst({
    where: and(
      eq(schema.tripMembers.tripId, tripId),
      eq(schema.tripMembers.userId, user.id),
    ),
  });
  if (!member) redirect("/trips");
  await setTripCookie(tripId);
  redirect(member.status === "approved" ? "/" : "/trips/pending");
}

export async function createTrip(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "");
  const startTime = String(formData.get("startTime") ?? "15:00");
  const endDate = String(formData.get("endDate") ?? "");
  const endTime = String(formData.get("endTime") ?? "12:00");
  const venuesRaw = String(formData.get("venues") ?? "");
  if (!name || !startDate || !endDate) throw new Error("入力が不足しています");

  const db = await getDb();
  const [trip] = await db
    .insert(schema.trips)
    .values({
      name,
      startsAt: jstDate(startDate, startTime),
      endsAt: jstDate(endDate, endTime),
      createdBy: user.id,
    })
    .returning();
  await db.insert(schema.tripMembers).values({
    tripId: trip.id,
    userId: user.id,
    role: "admin",
    status: "approved",
  });
  const venueNames = venuesRaw
    .split(/[,、\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (venueNames.length > 0) {
    await db.insert(schema.venues).values(
      venueNames.map((n, i) => ({ tripId: trip.id, name: n, sortOrder: i })),
    );
  }
  await setTripCookie(trip.id);
  redirect("/");
}

// 招待リンク(/join/[tripId])からの参加リクエスト
export async function requestJoin(tripId: string) {
  const user = await requireUser();
  const db = await getDb();
  const trip = await db.query.trips.findFirst({
    where: eq(schema.trips.id, tripId),
  });
  if (!trip) redirect("/trips");
  await db
    .insert(schema.tripMembers)
    .values({ tripId, userId: user.id, status: "pending" })
    .onConflictDoNothing();
  // 管理者へお知らせ
  const admins = await db.query.tripMembers.findMany({
    where: and(
      eq(schema.tripMembers.tripId, tripId),
      eq(schema.tripMembers.role, "admin"),
    ),
  });
  await notify(
    db,
    tripId,
    admins.map((a) => a.userId),
    {
      type: "announce",
      title: `${user.name ?? user.email} さんが参加をリクエストしました`,
      body: "メンバー管理から承認してください。",
      link: "/manage/members",
      senderId: user.id,
    },
  );
  await setTripCookie(tripId);
  redirect("/trips/pending");
}

// 旅程(開始・終了日時)の更新。予定表の日付タブがこの範囲で生成される
export async function updateTripDates(formData: FormData) {
  const { trip, db, isAdmin } = await requireTripContext();
  if (!isAdmin) throw new Error("管理者のみ操作できます");
  const startDate = String(formData.get("startDate") ?? "");
  const startTime = String(formData.get("startTime") ?? "15:00");
  const endDate = String(formData.get("endDate") ?? "");
  const endTime = String(formData.get("endTime") ?? "12:00");
  if (!startDate || !endDate) return;
  const startsAt = jstDate(startDate, startTime);
  const endsAt = jstDate(endDate, endTime);
  if (endsAt <= startsAt) throw new Error("終了日時は開始より後にしてください");
  await db
    .update(schema.trips)
    .set({ startsAt, endsAt })
    .where(eq(schema.trips.id, trip.id));
  revalidatePath("/manage/trip");
  revalidatePath("/schedule");
  revalidatePath("/");
}

// 企画名の更新
export async function updateTripName(formData: FormData) {
  const { trip, db, isAdmin } = await requireTripContext();
  if (!isAdmin) throw new Error("管理者のみ操作できます");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db.update(schema.trips).set({ name }).where(eq(schema.trips.id, trip.id));
  revalidatePath("/manage/trip");
  revalidatePath("/");
}

// リマインドのデフォルト分数(イベント開始の何分前に通知するか)
export async function updateReminderMinutes(formData: FormData) {
  const { trip, db, isAdmin } = await requireTripContext();
  if (!isAdmin) throw new Error("管理者のみ操作できます");
  const n = Number(String(formData.get("reminderMinutes") ?? "").replace(/[^\d]/g, ""));
  if (!Number.isFinite(n) || n < 0 || n > 1440) return;
  await db
    .update(schema.trips)
    .set({ reminderMinutes: n })
    .where(eq(schema.trips.id, trip.id));
  revalidatePath("/manage/trip");
}

// 企画の削除(その企画の管理者のみ)。配下の会場・イベント・費用・持ち物・お知らせもすべて削除される
export async function deleteTrip(tripId: string) {
  const user = await requireUser();
  const db = await getDb();
  const member = await db.query.tripMembers.findFirst({
    where: and(
      eq(schema.tripMembers.tripId, tripId),
      eq(schema.tripMembers.userId, user.id),
    ),
  });
  if (!member || member.role !== "admin") {
    throw new Error("この企画の管理者のみ削除できます");
  }
  await db.delete(schema.trips).where(eq(schema.trips.id, tripId));
  const store = await cookies();
  if (store.get(TRIP_COOKIE)?.value === tripId) {
    store.delete(TRIP_COOKIE);
  }
  redirect("/trips");
}

export async function approveMember(formData: FormData) {
  const { trip, db, isAdmin, user } = await requireTripContext();
  if (!isAdmin) throw new Error("管理者のみ操作できます");
  const userId = String(formData.get("userId"));
  const action = String(formData.get("action")); // approve | reject
  await db
    .update(schema.tripMembers)
    .set({ status: action === "approve" ? "approved" : "rejected" })
    .where(
      and(
        eq(schema.tripMembers.tripId, trip.id),
        eq(schema.tripMembers.userId, userId),
      ),
    );
  if (action === "approve") {
    await notify(db, trip.id, [userId], {
      type: "announce",
      title: `「${trip.name}」への参加が承認されました`,
      body: "アプリの全機能が利用できます。",
      link: "/",
      senderId: user.id,
    });
  }
  revalidatePath("/manage/members");
}
