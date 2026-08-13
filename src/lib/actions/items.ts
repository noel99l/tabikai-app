"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { schema } from "@/db";
import { requireTripContext } from "@/lib/session";

export async function addItem(formData: FormData) {
  const { user, trip, db } = await requireTripContext();
  const name = String(formData.get("name") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  const eventId = String(formData.get("eventId") ?? "") || null;
  if (!name) return;
  await db.insert(schema.items).values({
    tripId: trip.id,
    eventId,
    name,
    note,
    addedBy: user.id,
  });
  revalidatePath("/items");
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

// ステータスを直接切り替える(足りない / 調達予定 / 準備OK)
export async function setItemStatus(
  itemId: string,
  status: "missing" | "planned" | "ready",
  method: "bring" | "buy" = "bring",
) {
  const { user, db } = await requireTripContext();
  if (status === "missing") {
    await db
      .update(schema.items)
      .set({ assigneeId: null, method: null, done: false })
      .where(eq(schema.items.id, itemId));
  } else if (status === "planned") {
    // 担当者未設定なら自分を担当に
    const item = await db.query.items.findFirst({
      where: eq(schema.items.id, itemId),
    });
    await db
      .update(schema.items)
      .set({
        assigneeId: item?.assigneeId ?? user.id,
        method: item?.method ?? method,
        done: false,
      })
      .where(eq(schema.items.id, itemId));
  } else {
    // ready: 担当者未設定なら自分を担当にして完了
    const item = await db.query.items.findFirst({
      where: eq(schema.items.id, itemId),
    });
    await db
      .update(schema.items)
      .set({
        assigneeId: item?.assigneeId ?? user.id,
        method: item?.method ?? method,
        done: true,
      })
      .where(eq(schema.items.id, itemId));
  }
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
