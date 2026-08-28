"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { schema } from "@/db";
import { requireTripContext } from "@/lib/session";

export async function addVenue(formData: FormData) {
  const { trip, db, isAdmin } = await requireTripContext();
  if (!isAdmin) throw new Error("管理者のみ操作できます");
  const name = String(formData.get("name") ?? "").trim();
  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  const openFrom = String(formData.get("openFrom") ?? "").trim() || null;
  const openTo = String(formData.get("openTo") ?? "").trim() || null;
  const showInSchedule = formData.get("showInSchedule") !== null; // 未指定=非表示
  const isPrivate = formData.get("isPrivate") !== null;
  if (!name) return;
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${schema.venues.sortOrder}), -1)` })
    .from(schema.venues)
    .where(eq(schema.venues.tripId, trip.id));
  await db.insert(schema.venues).values({
    tripId: trip.id,
    name,
    capacity: capacityRaw ? Number(capacityRaw.replace(/[^\d]/g, "")) || null : null,
    openFrom,
    openTo,
    showInSchedule,
    isPrivate,
    sortOrder: Number(max) + 1,
  });
  revalidatePath("/manage/venues");
  revalidatePath("/schedule");
  revalidatePath("/events");
}

// プライバシー保護(予約者を表示しない)の切替
export async function toggleVenuePrivate(venueId: string, value: boolean) {
  const { trip, db, isAdmin } = await requireTripContext();
  if (!isAdmin) throw new Error("管理者のみ操作できます");
  await db
    .update(schema.venues)
    .set({ isPrivate: value })
    .where(and(eq(schema.venues.id, venueId), eq(schema.venues.tripId, trip.id)));
  revalidatePath("/manage/venues");
  revalidatePath("/schedule");
  revalidatePath("/events");
}

// 予定表にデフォルト表示するかどうかの切替
export async function toggleVenueVisible(venueId: string, visible: boolean) {
  const { trip, db, isAdmin } = await requireTripContext();
  if (!isAdmin) throw new Error("管理者のみ操作できます");
  await db
    .update(schema.venues)
    .set({ showInSchedule: visible })
    .where(and(eq(schema.venues.id, venueId), eq(schema.venues.tripId, trip.id)));
  revalidatePath("/manage/venues");
  revalidatePath("/schedule");
}

export async function updateVenue(formData: FormData) {
  const { trip, db, isAdmin } = await requireTripContext();
  if (!isAdmin) throw new Error("管理者のみ操作できます");
  const id = String(formData.get("venueId"));
  const name = String(formData.get("name") ?? "").trim();
  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  const openFrom = String(formData.get("openFrom") ?? "").trim() || null;
  const openTo = String(formData.get("openTo") ?? "").trim() || null;
  if (!name) return;
  await db
    .update(schema.venues)
    .set({
      name,
      capacity: capacityRaw ? Number(capacityRaw.replace(/[^\d]/g, "")) || null : null,
      openFrom,
      openTo,
    })
    .where(and(eq(schema.venues.id, id), eq(schema.venues.tripId, trip.id)));
  revalidatePath("/manage/venues");
  revalidatePath("/schedule");
}

export async function deleteVenue(venueId: string) {
  const { trip, db, isAdmin } = await requireTripContext();
  if (!isAdmin) throw new Error("管理者のみ操作できます");
  // その会場にイベントがある場合は削除させない(予定表の列が消えると混乱するため)
  const events = await db.query.events.findMany({
    where: eq(schema.events.venueId, venueId),
  });
  if (events.length > 0) {
    throw new Error("この会場にはイベントがあるため削除できません。先にイベントを削除してください。");
  }
  await db
    .delete(schema.venues)
    .where(and(eq(schema.venues.id, venueId), eq(schema.venues.tripId, trip.id)));
  revalidatePath("/manage/venues");
  revalidatePath("/schedule");
}
