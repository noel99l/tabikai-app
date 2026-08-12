"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { schema } from "@/db";
import { requireTripContext } from "@/lib/session";

export async function addItem(formData: FormData) {
  const { user, trip, db } = await requireTripContext();
  const name = String(formData.get("name") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  const eventId = String(formData.get("eventId") ?? "") || null;
  if (!name) throw new Error("品名を入力してください");
  await db.insert(schema.items).values({
    tripId: trip.id,
    eventId,
    name,
    note,
    addedBy: user.id,
  });
  redirect("/items");
}

// 「持っていく」(bring) / 「買ってくる」(buy) の引き受け
export async function claimItem(itemId: string, method: "bring" | "buy") {
  const { user, db } = await requireTripContext();
  await db
    .update(schema.items)
    .set({ assigneeId: user.id, method })
    .where(eq(schema.items.id, itemId));
  revalidatePath("/items");
}

export async function markItemDone(itemId: string) {
  const { db } = await requireTripContext();
  await db
    .update(schema.items)
    .set({ done: true })
    .where(eq(schema.items.id, itemId));
  revalidatePath("/items");
}

export async function deleteItem(itemId: string) {
  const { user, db, isAdmin } = await requireTripContext();
  const item = await db.query.items.findFirst({
    where: eq(schema.items.id, itemId),
  });
  if (!item) return;
  if (item.addedBy !== user.id && !isAdmin) {
    throw new Error("追加した本人または管理者のみ削除できます");
  }
  await db.delete(schema.items).where(eq(schema.items.id, itemId));
  revalidatePath("/items");
}
