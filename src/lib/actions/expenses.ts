"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { schema } from "@/db";
import { yen } from "@/lib/format";
import { notify } from "@/lib/notify";
import { getApprovedMembers, requireTripContext } from "@/lib/session";

// 均等割り(端数は先頭から1円ずつ負担)
function splitAmount(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const remainder = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

export async function createExpense(formData: FormData) {
  const { user, trip, db } = await requireTripContext();
  const title = String(formData.get("title") ?? "").trim();
  const amount = Number(String(formData.get("amount") ?? "").replace(/[^\d]/g, ""));
  const paidBy = String(formData.get("paidBy") ?? user.id);
  const splitAll = formData.get("splitAll") === "on";
  const eventId = String(formData.get("eventId") ?? "");
  const memberIds = formData.getAll("memberIds").map(String);
  if (!title || !Number.isFinite(amount) || amount <= 0) {
    return { error: "内容と金額を入力してください" };
  }

  const members = await getApprovedMembers();
  let targetIds: string[];
  if (splitAll) {
    // 全員割り勘: イベント紐付けなし・承認なしで確定
    targetIds = members.map((m) => m.userId);
  } else {
    // 個別割り勘: イベント紐付け必須
    if (!eventId) return { error: "個別割り勘では関連イベントの指定が必須です" };
    if (memberIds.length === 0) return { error: "負担するメンバーを選択してください" };
    targetIds = memberIds;
  }

  const [expense] = await db
    .insert(schema.expenses)
    .values({
      tripId: trip.id,
      eventId: splitAll ? null : eventId,
      title,
      amount,
      paidBy,
      splitAll,
      createdBy: user.id,
    })
    .returning();

  const amounts = splitAmount(amount, targetIds.length);
  await db.insert(schema.expenseShares).values(
    targetIds.map((userId, i) => ({
      expenseId: expense.id,
      userId,
      amount: amounts[i],
      // 全員割り勘は承認不要で確定 / 個別でも立替者本人は承認済み扱い
      status: splitAll || userId === paidBy ? ("approved" as const) : ("pending" as const),
    })),
  );

  const payerName = members.find((m) => m.userId === paidBy)?.name ?? "";
  // (通知送信後にモーダルを閉じるだけで反映されるよう、遷移せずrevalidateする)
  if (splitAll) {
    await notify(
      db,
      trip.id,
      targetIds.filter((id) => id !== user.id),
      {
        type: "expense_confirmed",
        title: `「${title}」が全員負担で計上されました`,
        body: `${payerName} さんが立替 · ${yen(amount)}(1人 ${yen(amounts[0])})`,
        link: "/expenses",
        senderId: user.id,
      },
    );
  } else {
    await notify(
      db,
      trip.id,
      targetIds.filter((id) => id !== paidBy && id !== user.id),
      {
        type: "expense_assigned",
        title: `「${title}」の割り勘対象になりました`,
        body: `${payerName} さんが立替 · 合計 ${yen(amount)}`,
        link: "/approvals",
        senderId: user.id,
      },
    );
  }
  revalidatePath("/expenses");
  revalidatePath("/approvals");
  revalidatePath("/");
}

export async function approveShare(expenseId: string) {
  const { user, db } = await requireTripContext();
  await db
    .update(schema.expenseShares)
    .set({ status: "approved", resolvedAt: new Date() })
    .where(
      and(
        eq(schema.expenseShares.expenseId, expenseId),
        eq(schema.expenseShares.userId, user.id),
        eq(schema.expenseShares.status, "pending"),
      ),
    );
  revalidatePath("/approvals");
  revalidatePath("/expenses");
}

// 主催者/管理者による操作: 承認として確定(forced) or 割り勘対象から外す(excluded)
export async function resolveShare(formData: FormData) {
  const { user, db, isAdmin } = await requireTripContext();
  const expenseId = String(formData.get("expenseId"));
  const userId = String(formData.get("userId"));
  const action = String(formData.get("action")); // force | exclude
  const expense = await db.query.expenses.findFirst({
    where: eq(schema.expenses.id, expenseId),
  });
  if (!expense) throw new Error("費用が見つかりません");
  let allowed = isAdmin;
  if (!allowed && expense.eventId) {
    const event = await db.query.events.findFirst({
      where: eq(schema.events.id, expense.eventId),
    });
    allowed = event?.hostId === user.id;
  }
  if (!allowed) throw new Error("イベント主催者または管理者のみ操作できます");
  await db
    .update(schema.expenseShares)
    .set({
      status: action === "force" ? "forced" : "excluded",
      resolvedBy: user.id,
      resolvedAt: new Date(),
    })
    .where(
      and(
        eq(schema.expenseShares.expenseId, expenseId),
        eq(schema.expenseShares.userId, userId),
      ),
    );
  await notify(db, expense.tripId, [userId], {
    type: "expense_confirmed",
    title:
      action === "force"
        ? `「${expense.title}」が承認として確定されました`
        : `「${expense.title}」の割り勘対象から外されました`,
    body: "主催者または管理者による操作です。",
    link: "/expenses",
    senderId: user.id,
  });
  revalidatePath("/approvals");
  revalidatePath("/expenses");
}

// 費用の編集(内容・金額・立替者)。作成者・立替者・管理者のみ。
// 金額が変わったら割り勘額を再計算し、個別割り勘は再承認のため pending に戻す。
export async function updateExpense(formData: FormData) {
  const { user, db, isAdmin } = await requireTripContext();
  const expenseId = String(formData.get("expenseId"));
  const title = String(formData.get("title") ?? "").trim();
  const amount = Number(String(formData.get("amount") ?? "").replace(/[^\d]/g, ""));
  const paidBy = String(formData.get("paidBy") ?? "");
  const expense = await db.query.expenses.findFirst({
    where: eq(schema.expenses.id, expenseId),
  });
  if (!expense) return { error: "費用が見つかりません" };
  if (expense.createdBy !== user.id && expense.paidBy !== user.id && !isAdmin) {
    return { error: "作成者・立替者・管理者のみ編集できます" };
  }
  if (!title || !Number.isFinite(amount) || amount <= 0) {
    return { error: "内容と金額を入力してください" };
  }

  const amountChanged = amount !== expense.amount;
  await db
    .update(schema.expenses)
    .set({ title, amount, paidBy: paidBy || expense.paidBy })
    .where(eq(schema.expenses.id, expenseId));

  if (amountChanged) {
    // excluded 以外の対象者で再分割
    const shares = await db.query.expenseShares.findMany({
      where: eq(schema.expenseShares.expenseId, expenseId),
    });
    const active = shares.filter((s) => s.status !== "excluded");
    const amounts = splitAmount(amount, Math.max(1, active.length));
    const newPayer = paidBy || expense.paidBy;
    for (let i = 0; i < active.length; i++) {
      await db
        .update(schema.expenseShares)
        .set({
          amount: amounts[i],
          status: expense.splitAll
            ? "approved"
            : active[i].userId === newPayer
              ? "approved"
              : "pending",
        })
        .where(
          and(
            eq(schema.expenseShares.expenseId, expenseId),
            eq(schema.expenseShares.userId, active[i].userId),
          ),
        );
    }
    if (!expense.splitAll) {
      await notify(
        db,
        expense.tripId,
        active
          .map((s) => s.userId)
          .filter((id) => id !== user.id && id !== newPayer),
        {
          type: "expense_assigned",
          title: `「${title}」の金額が変更されました`,
          body: `合計 ${yen(amount)} に更新 · 再度ご確認ください`,
          link: "/approvals",
          senderId: user.id,
        },
      );
    }
  }
  revalidatePath("/expenses");
  revalidatePath("/approvals");
  revalidatePath("/");
}

// 費用の削除。作成者・立替者・管理者のみ。
export async function deleteExpense(expenseId: string) {
  const { user, db, isAdmin } = await requireTripContext();
  const expense = await db.query.expenses.findFirst({
    where: eq(schema.expenses.id, expenseId),
  });
  if (!expense) return;
  if (expense.createdBy !== user.id && expense.paidBy !== user.id && !isAdmin) {
    throw new Error("作成者・立替者・管理者のみ削除できます");
  }
  await db.delete(schema.expenses).where(eq(schema.expenses.id, expenseId));
  revalidatePath("/expenses");
  revalidatePath("/approvals");
  revalidatePath("/");
}
