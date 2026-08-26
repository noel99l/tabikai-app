"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { schema } from "@/db";
import { notify } from "@/lib/notify";
import { requireTripContext } from "@/lib/session";

export async function addItem(formData: FormData) {
  const { user, trip, db } = await requireTripContext();
  const name = String(formData.get("name") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  const eventId = String(formData.get("eventId") ?? "") || null;
  if (!name) return;
  // 新規は一番下(優先度低)に追加
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${schema.items.sortOrder}), -1)` })
    .from(schema.items)
    .where(eq(schema.items.tripId, trip.id));
  await db.insert(schema.items).values({
    tripId: trip.id,
    eventId,
    name,
    note,
    addedBy: user.id,
    sortOrder: Number(max) + 1,
  });
  revalidatePath("/items");
}

// ドラッグ&ドロップの並び替え(優先度)。表示順のID配列を受け取り一括更新する
export async function reorderItems(orderedIds: string[]) {
  const { trip, db } = await requireTripContext();
  const rows = await db.query.items.findMany({
    where: eq(schema.items.tripId, trip.id),
  });
  const valid = new Set(rows.map((r) => r.id));
  const ids = orderedIds.filter((id) => valid.has(id));
  await Promise.all(
    ids.map((id, i) =>
      db
        .update(schema.items)
        .set({ sortOrder: i })
        .where(eq(schema.items.id, id)),
    ),
  );
  revalidatePath("/items");
}

// ステータス変更(足りない / 調達予定 / 準備OK)。
// 掲載者への情報連携: 引き受け・完了・取り消しをお知らせ+プッシュで通知する。
export async function setItemStatus(
  itemId: string,
  status: "missing" | "planned" | "ready",
  method: "bring" | "buy" = "bring",
) {
  const { user, trip, db } = await requireTripContext();
  const item = await db.query.items.findFirst({
    where: eq(schema.items.id, itemId),
  });
  if (!item || item.tripId !== trip.id) return;

  if (status === "missing") {
    // 担当を外して募集中に戻す
    await db
      .update(schema.items)
      .set({ assigneeId: null, method: null, done: false })
      .where(eq(schema.items.id, itemId));
    if (item.assigneeId && item.addedBy !== user.id) {
      await notify(db, trip.id, [item.addedBy], {
        type: "item_update",
        title: `「${item.name}」の担当がなくなりました`,
        body: `${user.name} さんが取り消しました · 再度募集中です`,
        link: "/items",
        senderId: user.id,
      });
    }
  } else if (status === "planned") {
    // 引き受け(持参 or 買い出し)。担当未設定なら自分が担当に
    const assigneeId = item.assigneeId ?? user.id;
    const m = item.assigneeId ? (item.method ?? method) : method;
    await db
      .update(schema.items)
      .set({ assigneeId, method: m, done: false })
      .where(eq(schema.items.id, itemId));
    if (!item.assigneeId && item.addedBy !== user.id) {
      await notify(db, trip.id, [item.addedBy], {
        type: "item_update",
        title:
          m === "buy"
            ? `「${item.name}」は ${user.name} さんが買ってきます`
            : `「${item.name}」は ${user.name} さんが持っていきます`,
        link: "/items",
        senderId: user.id,
      });
    }
  } else {
    // 準備OK(購入完了 / 持参準備済み)
    const assigneeId = item.assigneeId ?? user.id;
    const m = item.method ?? method;
    await db
      .update(schema.items)
      .set({ assigneeId, method: m, done: true })
      .where(eq(schema.items.id, itemId));
    if (item.addedBy !== user.id) {
      await notify(db, trip.id, [item.addedBy], {
        type: "item_update",
        title:
          m === "buy"
            ? `「${item.name}」が購入されました`
            : `「${item.name}」の準備ができました`,
        body:
          m === "buy"
            ? `${user.name} さんが購入 · 費用は割り勘に登録できます`
            : `${user.name} さんが持参します`,
        link: "/items",
        senderId: user.id,
      });
    }
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
