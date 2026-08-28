"use server";

import { randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
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
  // 自動承認モード中は承認待ちを挟まず、即メンバーとして参加できる
  const autoApprove = trip.autoApprove;
  await db
    .insert(schema.tripMembers)
    .values({
      tripId,
      userId: user.id,
      status: autoApprove ? "approved" : "pending",
    })
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
    admins.map((a) => a.userId).filter((id) => id !== user.id),
    autoApprove
      ? {
          type: "announce",
          title: `${user.name ?? user.email} さんが参加しました`,
          body: "自動承認モードにより承認済みです。",
          link: "/manage/members",
          senderId: user.id,
        }
      : {
          type: "announce",
          title: `${user.name ?? user.email} さんが参加をリクエストしました`,
          body: "メンバー管理から承認してください。",
          link: "/manage/members",
          senderId: user.id,
        },
  );
  await setTripCookie(tripId);
  redirect(autoApprove ? "/" : "/trips/pending");
}

// 参加リクエストの自動承認モードの切替(管理者のみ)
export async function setAutoApprove(next: boolean) {
  const { trip, db, isAdmin } = await requireTripContext();
  if (!isAdmin) throw new Error("管理者のみ操作できます");
  await db
    .update(schema.trips)
    .set({ autoApprove: next })
    .where(eq(schema.trips.id, trip.id));
  revalidatePath("/manage/members");
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

// イベントロゴの登録・削除。クライアントで128px正方形にリサイズ済みの data URL を受け取る。
export async function updateTripLogo(dataUrl: string | null) {
  const { trip, db, isAdmin } = await requireTripContext();
  if (!isAdmin) throw new Error("管理者のみ操作できます");
  // data URL の画像のみ許可。サイズ上限(~200KB)で肥大化を防ぐ
  if (dataUrl !== null) {
    if (!dataUrl.startsWith("data:image/")) return { error: "画像を選択してください" };
    if (dataUrl.length > 200_000) return { error: "画像が大きすぎます" };
  }
  await db
    .update(schema.trips)
    .set({ logoUrl: dataUrl })
    .where(eq(schema.trips.id, trip.id));
  revalidatePath("/manage/trip");
  revalidatePath("/");
  revalidatePath("/trips");
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

// メンバー画面から管理者権限を付与する(管理者のみ)
export async function grantAdmin(userId: string) {
  const { user, trip, db, isAdmin } = await requireTripContext();
  if (!isAdmin) throw new Error("管理者のみ操作できます");
  await db
    .update(schema.tripMembers)
    .set({ role: "admin" })
    .where(
      and(
        eq(schema.tripMembers.tripId, trip.id),
        eq(schema.tripMembers.userId, userId),
        eq(schema.tripMembers.status, "approved"),
      ),
    );
  await notify(db, trip.id, [userId], {
    type: "announce",
    title: `「${trip.name}」の管理者になりました`,
    body: `${user.name} さんが権限を付与しました。管理者コンソールが利用できます。`,
    link: "/manage",
    senderId: user.id,
  });
  revalidatePath("/manage/members");
}

// 管理者招待URLのトークンを発行する(既存の未使用トークンがあれば再利用)
export async function createAdminInvite(): Promise<string> {
  const { trip, db, isAdmin, user } = await requireTripContext();
  if (!isAdmin) throw new Error("管理者のみ操作できます");
  const existing = await db.query.adminInvites.findFirst({
    where: and(
      eq(schema.adminInvites.tripId, trip.id),
      isNull(schema.adminInvites.usedBy),
    ),
  });
  if (existing) return existing.token;
  const token = randomBytes(16).toString("hex");
  await db.insert(schema.adminInvites).values({
    tripId: trip.id,
    token,
    createdBy: user.id,
  });
  revalidatePath("/manage/members");
  return token;
}

// 管理者招待トークンを承諾して管理者権限を得る(承認済みメンバーのみ)
export async function acceptAdminInvite(token: string) {
  const user = await requireUser();
  const db = await getDb();
  const invite = await db.query.adminInvites.findFirst({
    where: eq(schema.adminInvites.token, token),
  });
  if (!invite || invite.usedBy) redirect("/trips");
  const member = await db.query.tripMembers.findFirst({
    where: and(
      eq(schema.tripMembers.tripId, invite.tripId),
      eq(schema.tripMembers.userId, user.id),
    ),
  });
  if (!member || member.status !== "approved") {
    // まだ参加していない場合は参加リンクへ誘導
    redirect(`/join/${invite.tripId}`);
  }
  await db
    .update(schema.tripMembers)
    .set({ role: "admin" })
    .where(
      and(
        eq(schema.tripMembers.tripId, invite.tripId),
        eq(schema.tripMembers.userId, user.id),
      ),
    );
  await db
    .update(schema.adminInvites)
    .set({ usedBy: user.id })
    .where(eq(schema.adminInvites.id, invite.id));
  await setTripCookie(invite.tripId);
  redirect("/manage");
}
