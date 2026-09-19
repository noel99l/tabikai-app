"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { schema } from "@/db";
import { getApprovedMembers, requireTripContext } from "@/lib/session";
import { THANKS_MESSAGE_MAX } from "@/lib/thanks";

// 自分が送った合計ポイント(手持ちの残りを計算する)
async function givenTotal(
  db: Awaited<ReturnType<typeof requireTripContext>>["db"],
  tripId: string,
  userId: string,
) {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${schema.thanksPoints.points}), 0)` })
    .from(schema.thanksPoints)
    .where(and(eq(schema.thanksPoints.tripId, tripId), eq(schema.thanksPoints.fromUserId, userId)));
  return Number(row?.total ?? 0);
}

// メンバーにメッセージつきでポイントを送る。手持ち(trips.thanksBudget)を超えては送れない
export async function giveThanks(formData: FormData) {
  const { user, trip, db } = await requireTripContext();
  const toUserId = String(formData.get("toUserId") ?? "");
  const points = Number(String(formData.get("points") ?? "").replace(/[^\d]/g, ""));
  const message = String(formData.get("message") ?? "").trim();
  if (!toUserId) return { error: "送る相手を選んでください" };
  if (toUserId === user.id) return { error: "自分には送れません" };
  if (!Number.isInteger(points) || points < 1) return { error: "ポイントは1以上で指定してください" };
  if (!message) return { error: "メッセージを入力してください" };
  if ([...message].length > THANKS_MESSAGE_MAX) {
    return { error: `メッセージは${THANKS_MESSAGE_MAX}文字以内で入力してください` };
  }
  const members = await getApprovedMembers();
  if (!members.some((m) => m.userId === toUserId)) return { error: "このメンバーには送れません" };

  const used = await givenTotal(db, trip.id, user.id);
  const remaining = trip.thanksBudget - used;
  if (points > remaining) {
    return { error: `手持ちが足りません(残り ${Math.max(0, remaining)} pt)` };
  }
  await db.insert(schema.thanksPoints).values({
    tripId: trip.id,
    fromUserId: user.id,
    toUserId,
    points,
    message,
  });
  revalidatePath("/thanks");
  revalidatePath("/settings");
  revalidatePath("/manage/thanks");
}

// 自分が送ったポイントを取り消す(手持ちに戻る)
export async function cancelThanks(id: string) {
  const { user, trip, db } = await requireTripContext();
  await db
    .delete(schema.thanksPoints)
    .where(
      and(
        eq(schema.thanksPoints.id, id),
        eq(schema.thanksPoints.tripId, trip.id),
        eq(schema.thanksPoints.fromUserId, user.id),
      ),
    );
  revalidatePath("/thanks");
  revalidatePath("/settings");
  revalidatePath("/manage/thanks");
}

// 手持ちポイントの設定(管理者のみ)。すでに送った分より少なくはできない
export async function updateThanksBudget(formData: FormData) {
  const { trip, db, isAdmin } = await requireTripContext();
  if (!isAdmin) throw new Error("管理者のみ操作できます");
  const n = Number(String(formData.get("thanksBudget") ?? "").replace(/[^\d]/g, ""));
  if (!Number.isInteger(n) || n < 0 || n > 1000) return;
  const [maxGiven] = await db
    .select({ v: sql<number>`coalesce(max(t.total), 0)` })
    .from(
      sql`(select sum(${schema.thanksPoints.points}) as total from ${schema.thanksPoints} where ${schema.thanksPoints.tripId} = ${trip.id} group by ${schema.thanksPoints.fromUserId}) as t`,
    );
  if (n < Number(maxGiven?.v ?? 0)) {
    throw new Error(`すでに ${maxGiven.v} pt 送っているメンバーがいるため、それ未満には設定できません`);
  }
  await db.update(schema.trips).set({ thanksBudget: n }).where(eq(schema.trips.id, trip.id));
  revalidatePath("/manage/thanks");
  revalidatePath("/manage");
  revalidatePath("/thanks");
}
