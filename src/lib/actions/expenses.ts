"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { schema } from "@/db";
import { redistributeShares, splitAmount } from "@/lib/expense-shares";
import { yen } from "@/lib/format";
import { notify } from "@/lib/notify";
import {
  RECEIPT_HARD_LIMIT_BYTES,
  RECEIPT_MAX_PER_EXPENSE,
  RECEIPT_MAX_PER_SUBMIT,
} from "@/lib/receipt-image";
import { getApprovedMembers, requireTripContext } from "@/lib/session";

const RECEIPT_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

// フォームの領収書(端末側で圧縮済みのbase64、複数可)を検証してバイナリにする。
// receiptData / receiptMime は同じ順序で複数送られる。不正な場合は error を返す
type ReceiptFile = { bytes: Buffer; mime: string };
function parseReceipts(formData: FormData): ReceiptFile[] | { error: string } {
  const datas = formData.getAll("receiptData").map(String).filter(Boolean);
  const mimes = formData.getAll("receiptMime").map(String);
  if (datas.length > RECEIPT_MAX_PER_SUBMIT) {
    return { error: `領収書は一度に${RECEIPT_MAX_PER_SUBMIT}枚まで追加できます` };
  }
  const out: ReceiptFile[] = [];
  for (let i = 0; i < datas.length; i++) {
    const data = datas[i];
    const mime = mimes[i] ?? "";
    if (!RECEIPT_MIMES.has(mime)) return { error: "領収書はJPEG/PNG/WebP画像のみ添付できます" };
    // base64長からおおよそのサイズを先に見て、巨大な入力をデコード前に弾く
    if (data.length > (RECEIPT_HARD_LIMIT_BYTES * 4) / 3 + 4) {
      return { error: "領収書の画像が大きすぎます。別の画像でお試しください" };
    }
    const bytes = Buffer.from(data, "base64");
    if (bytes.length === 0 || bytes.length > RECEIPT_HARD_LIMIT_BYTES) {
      return { error: "領収書の画像が大きすぎます。別の画像でお試しください" };
    }
    out.push({ bytes, mime });
  }
  return out;
}

// 領収書を追加保存する(既存は残す。削除は removeReceiptIds で個別に行う)
async function saveReceipts(
  db: Awaited<ReturnType<typeof requireTripContext>>["db"],
  tripId: string,
  expenseId: string,
  receipts: ReceiptFile[],
) {
  if (receipts.length === 0) return;
  await db.insert(schema.expenseReceipts).values(
    receipts.map((r) => ({
      expenseId,
      tripId,
      mime: r.mime,
      bytes: r.bytes,
      size: r.bytes.length,
    })),
  );
}

// 「全員で割り勘」の対象者。管理者がメンバー管理で対象外にしたメンバーを除く
function splitAllTargets(members: { userId: string; excludeFromSplitAll: boolean }[]) {
  return members.filter((m) => !m.excludeFromSplitAll).map((m) => m.userId);
}

export async function createExpense(formData: FormData) {
  const { user, trip, db } = await requireTripContext();
  const title = String(formData.get("title") ?? "").trim();
  const amount = Number(String(formData.get("amount") ?? "").replace(/[^\d]/g, ""));
  const paidBy = String(formData.get("paidBy") ?? user.id);
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null;
  const splitAll = formData.get("splitAll") === "on";
  const eventId = String(formData.get("eventId") ?? "");
  const memberIds = formData.getAll("memberIds").map(String);
  if (trip.expensesClosedAt) {
    return { error: "精算を締めた後は追加できません。管理者が締めを解除すると登録できます" };
  }
  if (!title || !Number.isFinite(amount) || amount <= 0) {
    return { error: "内容と金額を入力してください" };
  }
  const receipts = parseReceipts(formData);
  if ("error" in receipts) return { error: receipts.error };
  if (receipts.length > RECEIPT_MAX_PER_EXPENSE) {
    return { error: `領収書は1つの費用に${RECEIPT_MAX_PER_EXPENSE}枚までです` };
  }

  const members = await getApprovedMembers();
  let targetIds: string[];
  if (splitAll) {
    // 全員割り勘: イベント紐付けなし・承認なしで確定。管理者が対象外にしたメンバーは含めない
    targetIds = splitAllTargets(members);
    if (targetIds.length === 0) {
      return { error: "全員で割り勘の対象メンバーがいません(メンバー管理の設定を確認してください)" };
    }
  } else {
    // 個別割り勘: イベント紐付けは任意(「イベントの参加者」選択時のみ紐付く)。
    // 紐付けがない場合、未承認のエスカレーション先は管理者のみになる
    if (memberIds.length === 0) return { error: "負担するメンバーを選択してください" };
    targetIds = memberIds;
  }

  const [expense] = await db
    .insert(schema.expenses)
    .values({
      tripId: trip.id,
      eventId: splitAll ? null : eventId || null,
      title,
      amount,
      note,
      paidBy,
      splitAll,
      createdBy: user.id,
    })
    .returning();

  const amounts = splitAmount(amount, targetIds.length);
  await Promise.all([
    db.insert(schema.expenseShares).values(
      targetIds.map((userId, i) => ({
        expenseId: expense.id,
        userId,
        amount: amounts[i],
        // 全員割り勘は承認不要で確定 / 個別でも立替者本人は承認済み扱い
        status: splitAll || userId === paidBy ? ("approved" as const) : ("pending" as const),
      })),
    ),
    saveReceipts(db, trip.id, expense.id, receipts),
  ]);

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
        link: "/expenses/approvals",
        senderId: user.id,
      },
    );
  }
  revalidatePath("/expenses");
  revalidatePath("/expenses/approvals");
  revalidatePath("/home");
}

export async function approveShare(expenseId: string) {
  const { user, db } = await requireTripContext();
  await db
    .update(schema.expenseShares)
    .set({ status: "approved", resolvedAt: new Date(), rejectReason: null })
    .where(
      and(
        eq(schema.expenseShares.expenseId, expenseId),
        eq(schema.expenseShares.userId, user.id),
        eq(schema.expenseShares.status, "pending"),
      ),
    );
  revalidatePath("/expenses");
  revalidatePath("/expenses/approvals");
}

// 本人による否認(理由メッセージは任意)。対象からは外れず、主催者/管理者が最終判断する
// (承認として確定 or 対象から外す)。理由は承認画面と費用の内訳に表示され、通知にも載る
export async function rejectShare(expenseId: string, formData?: FormData) {
  const { user, trip, db } = await requireTripContext();
  const reason = String(formData?.get("reason") ?? "").trim().slice(0, 200) || null;
  const expense = await db.query.expenses.findFirst({
    where: eq(schema.expenses.id, expenseId),
  });
  if (!expense) return;
  await db
    .update(schema.expenseShares)
    .set({ status: "rejected", resolvedAt: new Date(), rejectReason: reason })
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
    body: reason
      ? `${user.name} さんが否認: 「${reason}」 · 承認画面から確定または対象から外せます`
      : `${user.name} さんが否認 · 承認画面から確定または対象から外せます`,
    link: "/expenses/approvals",
    senderId: user.id,
  });
  revalidatePath("/expenses");
  revalidatePath("/expenses/approvals");
}

// 主催者/管理者による操作: 承認として確定(forced) or 割り勘対象から外す(excluded)
export async function resolveShare(formData: FormData) {
  const { user, trip, db, isAdmin } = await requireTripContext();
  if (trip.expensesClosedAt) throw new Error("精算を締めた後は変更できません");
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
      // 対象外にした分は金額を 0 にする(以前の分担額を残さない)
      ...(action === "force" ? {} : { amount: 0 }),
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
  // 外した分を立替者が損しないよう、残りの対象者で割り直す
  if (action !== "force") {
    await redistributeShares(db, expense, user.id, {
      title: `「${expense.title}」の割り勘額が変更されました`,
      body: "対象から外れたメンバーの分を残りで割り直しました",
    });
  }
  revalidatePath("/expenses");
  revalidatePath("/expenses/approvals");
}

// 費用の編集(内容・金額・立替者・割り勘対象・領収書)。作成者・立替者・管理者のみ。
// 金額または対象が変わったら割り勘額を再計算する。承認済みの分は再承認不要でそのまま確定、
// 追加したメンバーだけが承認待ちになる。対象から外したメンバーは excluded にして通知する。
// ただし「全員で割り勘」(登録時に自動承認)から個別の割り勘へ変えた場合は、対象が絞られて
// 1人あたりの金額が上がるため、残る対象メンバー全員(立替者本人を除く)を承認待ちに戻し、
// 通常の個別割り勘と同じ承認フローを通す。
export async function updateExpense(formData: FormData) {
  const { user, trip, db, isAdmin } = await requireTripContext();
  const expenseId = String(formData.get("expenseId"));
  const title = String(formData.get("title") ?? "").trim();
  const amount = Number(String(formData.get("amount") ?? "").replace(/[^\d]/g, ""));
  const paidBy = String(formData.get("paidBy") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null;
  const expense = await db.query.expenses.findFirst({
    where: eq(schema.expenses.id, expenseId),
  });
  if (!expense) return { error: "費用が見つかりません" };
  if (expense.createdBy !== user.id && expense.paidBy !== user.id && !isAdmin) {
    return { error: "作成者・立替者・管理者のみ編集できます" };
  }
  if (trip.expensesClosedAt) {
    return { error: "精算を締めた後は変更できません。管理者が締めを解除すると編集できます" };
  }
  if (!title || !Number.isFinite(amount) || amount <= 0) {
    return { error: "内容と金額を入力してください" };
  }
  const receipts = parseReceipts(formData);
  if ("error" in receipts) return { error: receipts.error };
  // 個別に削除する既存の領収書ID
  const removeReceiptIds = formData.getAll("removeReceiptIds").map(String).filter(Boolean);
  if (receipts.length > 0 || removeReceiptIds.length > 0) {
    const existing = await db
      .select({ id: schema.expenseReceipts.id })
      .from(schema.expenseReceipts)
      .where(eq(schema.expenseReceipts.expenseId, expenseId));
    const remaining = existing.filter((r) => !removeReceiptIds.includes(r.id)).length;
    if (remaining + receipts.length > RECEIPT_MAX_PER_EXPENSE) {
      return { error: `領収書は1つの費用に${RECEIPT_MAX_PER_EXPENSE}枚までです` };
    }
  }

  // 割り勘対象の指定(splitMode があれば選び方ごと更新する。無ければ従来どおり据え置き)
  const splitMode = String(formData.get("splitMode") ?? "");
  let splitAll = expense.splitAll;
  let eventId = expense.eventId;
  let targetIds: string[] | null = null;
  if (splitMode) {
    const members = await getApprovedMembers();
    if (splitMode === "all") {
      splitAll = true;
      eventId = null;
      targetIds = splitAllTargets(members);
      if (targetIds.length === 0) {
        return { error: "全員で割り勘の対象メンバーがいません(メンバー管理の設定を確認してください)" };
      }
    } else {
      splitAll = false;
      const memberSet = new Set(members.map((m) => m.userId));
      targetIds = [...new Set(formData.getAll("memberIds").map(String))].filter((id) =>
        memberSet.has(id),
      );
      if (targetIds.length === 0) return { error: "負担するメンバーを選択してください" };
      eventId = splitMode === "event" ? String(formData.get("eventId") ?? "") || null : null;
    }
  }

  const amountChanged = amount !== expense.amount;
  const newPaidBy = paidBy || expense.paidBy;
  // 立替者が変わると「立替者本人は承認済み扱い」の対象も変わるため、状態を計算し直す
  const paidByChanged = newPaidBy !== expense.paidBy;
  const [shares] = await Promise.all([
    db.query.expenseShares.findMany({
      where: eq(schema.expenseShares.expenseId, expenseId),
    }),
    db
      .update(schema.expenses)
      .set({ title, amount, note, paidBy: newPaidBy, splitAll, eventId })
      .where(eq(schema.expenses.id, expenseId)),
    removeReceiptIds.length > 0
      ? db
          .delete(schema.expenseReceipts)
          .where(
            and(
              eq(schema.expenseReceipts.expenseId, expenseId),
              inArray(schema.expenseReceipts.id, removeReceiptIds),
            ),
          )
      : Promise.resolve(),
    saveReceipts(db, expense.tripId, expenseId, receipts),
  ]);

  // 対象の差分(追加・除外)を反映する
  let targetsChanged = splitAll !== expense.splitAll;
  // 全員割り勘(自動承認済み)→個別への変更は、金額が上がるので全員あらためて承認を求める
  const requireReapproval = expense.splitAll && !splitAll;
  const addedStatus = "pending" as const;
  if (targetIds) {
    const current = new Set(
      shares.filter((s) => s.status !== "excluded").map((s) => s.userId),
    );
    const next = new Set(targetIds);
    const added = targetIds.filter((id) => !current.has(id));
    const removed = [...current].filter((id) => !next.has(id));
    const existing = new Set(shares.map((s) => s.userId));
    targetsChanged = targetsChanged || added.length > 0 || removed.length > 0;

    const ops: Promise<unknown>[] = [];
    if (removed.length > 0) {
      ops.push(
        db
          .update(schema.expenseShares)
          .set({ status: "excluded", amount: 0, resolvedBy: user.id, resolvedAt: new Date() })
          .where(
            and(
              eq(schema.expenseShares.expenseId, expenseId),
              inArray(schema.expenseShares.userId, removed),
            ),
          ),
      );
    }
    // 以前 excluded だった人を戻す(金額・状態は後段の割り直しで確定)
    const reAdded = added.filter((id) => existing.has(id));
    if (reAdded.length > 0) {
      ops.push(
        db
          .update(schema.expenseShares)
          .set({ status: addedStatus, resolvedBy: null, resolvedAt: null })
          .where(
            and(
              eq(schema.expenseShares.expenseId, expenseId),
              inArray(schema.expenseShares.userId, reAdded),
            ),
          ),
      );
    }
    const brandNew = added.filter((id) => !existing.has(id));
    if (brandNew.length > 0) {
      ops.push(
        db.insert(schema.expenseShares).values(
          brandNew.map((userId) => ({ expenseId, userId, amount: 0, status: addedStatus })),
        ),
      );
    }
    if (removed.length > 0) {
      ops.push(
        notify(
          db,
          expense.tripId,
          removed.filter((id) => id !== user.id),
          {
            type: "expense_confirmed",
            title: `「${title}」の割り勘対象から外されました`,
            body: `${user.name} さんが対象メンバーを変更しました`,
            link: "/expenses",
            senderId: user.id,
          },
        ),
      );
    }
    await Promise.all(ops);
  }
  if (requireReapproval) {
    // 自動承認されていた分を承認待ちに戻す(立替者本人は承認不要のまま)。金額は後段の割り直しで確定
    await db
      .update(schema.expenseShares)
      .set({ status: "pending", resolvedBy: null, resolvedAt: null, rejectReason: null })
      .where(
        and(
          eq(schema.expenseShares.expenseId, expenseId),
          inArray(schema.expenseShares.status, ["approved", "forced"]),
          ne(schema.expenseShares.userId, newPaidBy),
        ),
      );
    targetsChanged = true;
  }

  if (amountChanged || targetsChanged || paidByChanged) {
    await redistributeShares(
      db,
      { id: expenseId, tripId: expense.tripId, title, amount, paidBy: newPaidBy, splitAll },
      user.id,
      targetsChanged
        ? {
            title: `「${title}」の割り勘対象が変更されました`,
            body: `合計 ${yen(amount)} を${targetIds?.length ?? ""}人で割り直し`,
          }
        : amountChanged
          ? {
              title: `「${title}」の金額が変更されました`,
              body: `合計 ${yen(amount)} に更新`,
            }
          : {
              title: `「${title}」の立替者が変更されました`,
              body: `立替者が変わりました`,
            },
    );
  }
  revalidatePath("/expenses");
  revalidatePath("/expenses/approvals");
  revalidatePath("/home");
}

// 費用の削除。作成者・立替者・管理者のみ。
export async function deleteExpense(expenseId: string) {
  const { user, trip, db, isAdmin } = await requireTripContext();
  if (trip.expensesClosedAt) throw new Error("精算を締めた後は削除できません");
  const expense = await db.query.expenses.findFirst({
    where: eq(schema.expenses.id, expenseId),
  });
  if (!expense) return;
  if (expense.createdBy !== user.id && expense.paidBy !== user.id && !isAdmin) {
    throw new Error("作成者・立替者・管理者のみ削除できます");
  }
  await db.delete(schema.expenses).where(eq(schema.expenses.id, expenseId));
  revalidatePath("/expenses");
  revalidatePath("/expenses/approvals");
  revalidatePath("/home");
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
  revalidatePath("/expenses/approvals");
  revalidatePath("/home");
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
  revalidatePath("/expenses/approvals");
  revalidatePath("/home");
}

// 精算の受け取り確認(受け取る側の本人のみ)。チェックを外すこともできる。
// 支払う側には「受け取りが確認されました」と知らせる
export async function setSettlementReceived(settlementId: string, received: boolean) {
  const { user, trip, db } = await requireTripContext();
  const s = await db.query.settlements.findFirst({
    where: and(eq(schema.settlements.id, settlementId), eq(schema.settlements.tripId, trip.id)),
  });
  if (!s) return;
  if (s.toUserId !== user.id) throw new Error("受け取る側の本人のみ操作できます");
  await db
    .update(schema.settlements)
    .set({ receivedAt: received ? new Date() : null })
    .where(eq(schema.settlements.id, settlementId));
  if (received && s.fromUserId !== user.id) {
    await notify(db, trip.id, [s.fromUserId], {
      type: "settlement",
      title: `${user.name} さんが ${yen(s.amount)} の受け取りを確認しました`,
      body: "精算リストの支払いが完了として記録されました。",
      link: "/expenses",
      senderId: user.id,
    });
  }
  revalidatePath("/expenses");
  revalidatePath("/manage/expenses");
}
