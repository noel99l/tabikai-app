"use server";

import { and, eq, gte, lt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { schema } from "@/db";
import { getApprovedMembers, requireTripContext } from "@/lib/session";
import {
  THANKS_CLOSED_MESSAGE,
  THANKS_MESSAGE_MAX,
  thanksClosed,
  thanksPeriodEnd,
  thanksPeriodStart,
} from "@/lib/thanks";

// 今日(直前の4:00から次の4:00まで)に自分が送った合計ポイント(手持ちの残りを計算する)
async function givenToday(
  db: Awaited<ReturnType<typeof requireTripContext>>["db"],
  tripId: string,
  userId: string,
  now: Date,
) {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${schema.thanksPoints.points}), 0)` })
    .from(schema.thanksPoints)
    .where(
      and(
        eq(schema.thanksPoints.tripId, tripId),
        eq(schema.thanksPoints.fromUserId, userId),
        gte(schema.thanksPoints.createdAt, thanksPeriodStart(now)),
        lt(schema.thanksPoints.createdAt, thanksPeriodEnd(now)),
      ),
    );
  return Number(row?.total ?? 0);
}

// メンバーにポイントを送る(コメントは任意・匿名可)。1日の手持ち(trips.thanksBudget、毎朝4:00にリセット)
// を超えては送れない。企画の終了後は送れない(残ったポイントは消滅)
export async function giveThanks(formData: FormData) {
  const { user, trip, db } = await requireTripContext();
  if (thanksClosed(trip)) return { error: THANKS_CLOSED_MESSAGE };
  const toUserId = String(formData.get("toUserId") ?? "");
  const points = Number(String(formData.get("points") ?? "").replace(/[^\d]/g, ""));
  const message = String(formData.get("message") ?? "").trim();
  const anonymous = formData.get("anonymous") === "on";
  if (!toUserId) return { error: "送る相手を選んでください" };
  if (toUserId === user.id) return { error: "自分には送れません" };
  if (!Number.isInteger(points) || points < 1) return { error: "ポイントは1以上で指定してください" };
  if ([...message].length > THANKS_MESSAGE_MAX) {
    return { error: `メッセージは${THANKS_MESSAGE_MAX}文字以内で入力してください` };
  }
  const members = await getApprovedMembers();
  if (!members.some((m) => m.userId === toUserId)) return { error: "このメンバーには送れません" };

  const now = new Date();
  const used = await givenToday(db, trip.id, user.id, now);
  const remaining = trip.thanksBudget - used;
  if (points > remaining) {
    return { error: `今日の手持ちが足りません(残り ${Math.max(0, remaining)} pt · 毎朝4:00にリセット)` };
  }
  await db.insert(schema.thanksPoints).values({
    tripId: trip.id,
    fromUserId: user.id,
    toUserId,
    points,
    message,
    anonymous,
  });
  revalidatePath("/thanks");
  revalidatePath("/settings");
  revalidatePath("/manage/thanks");
}

// 自分が送ったポイントを取り消す(手持ちに戻る)。今日(直前の4:00以降)に送った分のみ。
// 前日以前の分は手持ちがすでにリセットされているため取り消せない。企画の終了後も不可
export async function cancelThanks(id: string) {
  const { user, trip, db } = await requireTripContext();
  if (thanksClosed(trip)) return { error: THANKS_CLOSED_MESSAGE };
  const now = new Date();
  const deleted = await db
    .delete(schema.thanksPoints)
    .where(
      and(
        eq(schema.thanksPoints.id, id),
        eq(schema.thanksPoints.tripId, trip.id),
        eq(schema.thanksPoints.fromUserId, user.id),
        gte(schema.thanksPoints.createdAt, thanksPeriodStart(now)),
        lt(schema.thanksPoints.createdAt, thanksPeriodEnd(now)),
      ),
    )
    .returning({ id: schema.thanksPoints.id });
  if (deleted.length === 0) return { error: "前日以前に送った分は取り消せません" };
  revalidatePath("/thanks");
  revalidatePath("/settings");
  revalidatePath("/manage/thanks");
}

// 1日の手持ちポイントの設定(管理者のみ)。今日すでに送った分より少なくはできない
export async function updateThanksBudget(formData: FormData) {
  const { trip, db, isAdmin } = await requireTripContext();
  if (!isAdmin) throw new Error("管理者のみ操作できます");
  const n = Number(String(formData.get("thanksBudget") ?? "").replace(/[^\d]/g, ""));
  if (!Number.isInteger(n) || n < 0 || n > 1000) return;
  const now = new Date();
  const [maxGiven] = await db
    .select({ v: sql<number>`coalesce(max(t.total), 0)` })
    .from(
      sql`(select sum(${schema.thanksPoints.points}) as total from ${schema.thanksPoints}
           where ${schema.thanksPoints.tripId} = ${trip.id}
             and ${schema.thanksPoints.createdAt} >= ${thanksPeriodStart(now)}
             and ${schema.thanksPoints.createdAt} < ${thanksPeriodEnd(now)}
           group by ${schema.thanksPoints.fromUserId}) as t`,
    );
  if (n < Number(maxGiven?.v ?? 0)) {
    throw new Error(`今日すでに ${maxGiven.v} pt 送っているメンバーがいるため、それ未満には設定できません`);
  }
  await db.update(schema.trips).set({ thanksBudget: n }).where(eq(schema.trips.id, trip.id));
  revalidatePath("/manage/thanks");
  revalidatePath("/manage");
  revalidatePath("/thanks");
}
