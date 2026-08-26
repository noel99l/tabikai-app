"use server";

import { and, eq, inArray } from "drizzle-orm";
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

// 本人による否認。対象からは外れず、主催者/管理者が最終判断する(承認として確定 or 対象から外す)
export async function rejectShare(expenseId: string) {
  const { user, trip, db } = await requireTripContext();
  const expense = await db.query.expenses.findFirst({
    where: eq(schema.expenses.id, expenseId),
  });
  if (!expense) return;
  await db
    .update(schema.expenseShares)
    .set({ status: "rejected", resolvedAt: new Date() })
    .where(
      and(
        eq(schema.expenseShares.expenseId, expenseId),
        eq(schema.expenseShares.userId, user.id),
        eq(schema.expenseShares.status, "pending"),
      ),
    );
  // 立替者・登録者・イベント主催者に知らせて最終判断を促す
  const event = expense.eventId
    ? await db.query.events.findFirst({
        where: eq(schema.events.id, expense.eventId),
      })
    : undefined;
  const targets = [
    ...new Set(
      [expense.paidBy, expense.createdBy, event?.hostId].filter(
        (id): id is string => !!id && id !== user.id,
      ),
    ),
  ];
  await notify(db, trip.id, targets, {
    type: "expense_assigned",
    title: `「${expense.title}」が否認されました`,
    body: `${user.name} さんが否認 · 承認画面から確定または対象から外せます`,
    link: "/approvals",
    senderId: user.id,
  });
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

// 送金回数が最少になる精算リストを算出(貪欲法)
function computeSettlements(
  net: Map<string, number>,
): { from: string; to: string; amount: number }[] {
  const debtors: { id: string; amt: number }[] = []; // 支払う(net<0)
  const creditors: { id: string; amt: number }[] = []; // 受け取る(net>0)
  for (const [id, v] of net) {
    if (v < 0) debtors.push({ id, amt: -v });
    else if (v > 0) creditors.push({ id, amt: v });
  }
  debtors.sort((a, b) => b.amt - a.amt);
  creditors.sort((a, b) => b.amt - a.amt);
  const result: { from: string; to: string; amount: number }[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    if (pay > 0) {
      result.push({ from: debtors[i].id, to: creditors[j].id, amount: pay });
    }
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt === 0) i++;
    if (creditors[j].amt === 0) j++;
  }
  return result;
}

// 経費入力を締めて精算リストを公開する(管理者のみ)
export async function closeExpenses() {
  const { trip, db, isAdmin } = await requireTripContext();
  if (!isAdmin) throw new Error("管理者のみ操作できます");

  const expenses = await db.query.expenses.findMany({
    where: eq(schema.expenses.tripId, trip.id),
  });
  const net = new Map<string, number>();
  const add = (id: string, v: number) => net.set(id, (net.get(id) ?? 0) + v);
  if (expenses.length > 0) {
    const shares = await db.query.expenseShares.findMany({
      where: inArray(
        schema.expenseShares.expenseId,
        expenses.map((e) => e.id),
      ),
    });
    const payerOf = new Map(expenses.map((e) => [e.id, e.paidBy]));
    for (const s of shares) {
      if (s.status === "excluded") continue; // 対象外は精算に含めない
      const payer = payerOf.get(s.expenseId);
      if (!payer) continue;
      add(payer, s.amount); // 立替者は受け取る
      add(s.userId, -s.amount); // 対象者は支払う
    }
  }
  const settlements = computeSettlements(net);

  // 既存の精算を洗い替え
  await db.delete(schema.settlements).where(eq(schema.settlements.tripId, trip.id));
  if (settlements.length > 0) {
    await db.insert(schema.settlements).values(
      settlements.map((s) => ({
        tripId: trip.id,
        fromUserId: s.from,
        toUserId: s.to,
        amount: s.amount,
      })),
    );
  }
  await db
    .update(schema.trips)
    .set({ expensesClosedAt: new Date() })
    .where(eq(schema.trips.id, trip.id));

  const members = await getApprovedMembers();
  await notify(
    db,
    trip.id,
    members.map((m) => m.userId),
    {
      type: "settlement",
      title: "精算リストが公開されました",
      body: "費用画面で自分の支払い先・金額を確認できます。",
      link: "/expenses",
    },
  );
  revalidatePath("/manage/expenses");
  revalidatePath("/expenses");
  revalidatePath("/");
}

// 締めを解除して精算リストを取り消す(管理者のみ)
export async function reopenExpenses() {
  const { trip, db, isAdmin } = await requireTripContext();
  if (!isAdmin) throw new Error("管理者のみ操作できます");
  await db.delete(schema.settlements).where(eq(schema.settlements.tripId, trip.id));
  await db
    .update(schema.trips)
    .set({ expensesClosedAt: null })
    .where(eq(schema.trips.id, trip.id));
  revalidatePath("/manage/expenses");
  revalidatePath("/expenses");
  revalidatePath("/");
}
