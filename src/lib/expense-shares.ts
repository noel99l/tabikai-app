// 割り勘額の計算・割り直しのロジック(サーバーアクションから共用)。
// "use server" ファイルの export はすべてアクションになってしまうため、ここに分離している。
import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { notify } from "@/lib/notify";

type Db = Awaited<ReturnType<typeof getDb>>;

// 均等割り(端数は先頭から1円ずつ負担)
export function splitAmount(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const remainder = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

// excluded 以外の対象者で割り勘額を再計算する(金額編集・対象の増減時に使う)。
// 一度承認した分(approved / forced)は金額や人数が変わっても再承認不要でそのまま確定扱い。
// 承認待ち・否認中の分はその状態のまま金額だけ更新し、立替者本人は常に承認済み。
// 個別割り勘では対象者に金額変更を知らせる(承認待ちの人には承認画面へのリンク)。
export async function redistributeShares(
  db: Db,
  expense: {
    id: string;
    tripId: string;
    title: string;
    amount: number;
    paidBy: string;
    splitAll: boolean;
  },
  actorId: string,
  notice: { title: string; body: string },
) {
  const shares = await db.query.expenseShares.findMany({
    where: eq(schema.expenseShares.expenseId, expense.id),
  });
  // 対象外の分担は金額を 0 にする(以前の分担額が残らないように)
  if (shares.some((s) => s.status === "excluded" && s.amount !== 0)) {
    await db
      .update(schema.expenseShares)
      .set({ amount: 0 })
      .where(
        and(eq(schema.expenseShares.expenseId, expense.id), eq(schema.expenseShares.status, "excluded")),
      );
  }
  const active = shares.filter((s) => s.status !== "excluded");
  if (active.length === 0) return;
  const amounts = splitAmount(expense.amount, active.length);
  const nextStatus = (s: (typeof active)[number]) => {
    if (expense.splitAll) return "approved" as const;
    if (s.userId === expense.paidBy) return "approved" as const;
    // 承認済み・確定はそのまま。承認待ち・否認もそのまま(状態は変えず金額だけ更新)
    return s.status;
  };
  for (let i = 0; i < active.length; i++) {
    await db
      .update(schema.expenseShares)
      .set({ amount: amounts[i], status: nextStatus(active[i]) })
      .where(
        and(
          eq(schema.expenseShares.expenseId, expense.id),
          eq(schema.expenseShares.userId, active[i].userId),
        ),
      );
  }
  if (!expense.splitAll) {
    const targets = active.filter((s) => s.userId !== actorId && s.userId !== expense.paidBy);
    // 承認待ちの人は承認画面へ、承認済みの人は費用一覧へ(再承認は不要)
    const pending = targets.filter((s) => s.status === "pending" || s.status === "rejected");
    const settled = targets.filter((s) => s.status !== "pending" && s.status !== "rejected");
    await Promise.all([
      notify(db, expense.tripId, pending.map((s) => s.userId), {
        type: "expense_assigned",
        title: notice.title,
        body: `${notice.body} · 承認をお願いします`,
        link: "/expenses/approvals",
        senderId: actorId,
      }),
      notify(db, expense.tripId, settled.map((s) => s.userId), {
        type: "expense_confirmed",
        title: notice.title,
        body: `${notice.body} · 承認済みのため再承認は不要です`,
        link: "/expenses",
        senderId: actorId,
      }),
    ]);
  }
}

// 登録済みの「全員で割り勘」費用を、メンバー管理の対象外設定に合わせて割り直す。
// - 対象外にされたメンバーの分は excluded にして残りで再分配
// - 対象に戻されたメンバーは(その費用に分担があれば)approved に戻して再分配
// onlyUserId を渡すとそのメンバーの分だけ見る。戻り値は割り直した費用の件数
export async function syncSplitAllShares(
  db: Db,
  tripId: string,
  actorId: string,
  onlyUserId?: string,
): Promise<number> {
  const [expenses, members] = await Promise.all([
    db.query.expenses.findMany({
      where: and(eq(schema.expenses.tripId, tripId), eq(schema.expenses.splitAll, true)),
    }),
    db.query.tripMembers.findMany({
      where: and(eq(schema.tripMembers.tripId, tripId), eq(schema.tripMembers.status, "approved")),
    }),
  ]);
  if (expenses.length === 0) return 0;
  const excludedIds = new Set(
    members.filter((m) => m.excludeFromSplitAll).map((m) => m.userId),
  );
  const shares = await db.query.expenseShares.findMany({
    where: inArray(
      schema.expenseShares.expenseId,
      expenses.map((e) => e.id),
    ),
  });

  let changed = 0;
  for (const expense of expenses) {
    const mine = shares.filter(
      (s) => s.expenseId === expense.id && (!onlyUserId || s.userId === onlyUserId),
    );
    const toExclude = mine.filter((s) => excludedIds.has(s.userId) && s.status !== "excluded");
    const toInclude = mine.filter((s) => !excludedIds.has(s.userId) && s.status === "excluded");
    if (toExclude.length === 0 && toInclude.length === 0) continue;
    const ops: Promise<unknown>[] = [];
    if (toExclude.length > 0) {
      ops.push(
        db
          .update(schema.expenseShares)
          .set({ status: "excluded", amount: 0, resolvedBy: actorId, resolvedAt: new Date() })
          .where(
            and(
              eq(schema.expenseShares.expenseId, expense.id),
              inArray(schema.expenseShares.userId, toExclude.map((s) => s.userId)),
            ),
          ),
      );
    }
    if (toInclude.length > 0) {
      ops.push(
        db
          .update(schema.expenseShares)
          .set({ status: "approved", resolvedBy: null, resolvedAt: null })
          .where(
            and(
              eq(schema.expenseShares.expenseId, expense.id),
              inArray(schema.expenseShares.userId, toInclude.map((s) => s.userId)),
            ),
          ),
      );
    }
    await Promise.all(ops);
    // 全員割り勘は承認不要なので通知は出ない(金額だけ更新される)
    await redistributeShares(db, expense, actorId, { title: "", body: "" });
    changed++;
  }
  return changed;
}

// イベント紐付きの費用(「イベント参加者」で登録したもの)を、参加者の増減に合わせて割り直す。
// - added: 参加登録した/追加されたメンバー → 分担がなければ承認待ちで追加、対象外なら戻す
// - removed: 参加を取り消した/外されたメンバー → 分担を対象外にする
// 手動で対象を調整した分(参加者以外の追加など)はそのまま残す(参加者の差分だけ反映する)。
// 精算を締めた後は変更しない。戻り値は割り直した費用の件数
export async function syncEventExpenseShares(
  db: Db,
  tripId: string,
  eventId: string,
  actorId: string,
  diff: { added?: string[]; removed?: string[] },
): Promise<number> {
  const added = [...new Set(diff.added ?? [])];
  const removed = [...new Set(diff.removed ?? [])];
  if (added.length === 0 && removed.length === 0) return 0;
  const trip = await db.query.trips.findFirst({ where: eq(schema.trips.id, tripId) });
  if (!trip || trip.expensesClosedAt) return 0;
  const expenses = await db.query.expenses.findMany({
    where: and(
      eq(schema.expenses.tripId, tripId),
      eq(schema.expenses.eventId, eventId),
      eq(schema.expenses.splitAll, false),
    ),
  });
  if (expenses.length === 0) return 0;
  const shares = await db.query.expenseShares.findMany({
    where: inArray(
      schema.expenseShares.expenseId,
      expenses.map((e) => e.id),
    ),
  });

  let changed = 0;
  for (const expense of expenses) {
    const mine = shares.filter((s) => s.expenseId === expense.id);
    const byUser = new Map(mine.map((s) => [s.userId, s]));
    const toInsert = added.filter((id) => !byUser.has(id));
    const toRestore = added.filter((id) => byUser.get(id)?.status === "excluded");
    const toExclude = removed.filter((id) => {
      const s = byUser.get(id);
      return !!s && s.status !== "excluded";
    });
    if (toInsert.length === 0 && toRestore.length === 0 && toExclude.length === 0) continue;

    const ops: Promise<unknown>[] = [];
    if (toInsert.length > 0) {
      ops.push(
        db.insert(schema.expenseShares).values(
          toInsert.map((userId) => ({
            expenseId: expense.id,
            userId,
            amount: 0,
            status: "pending" as const,
          })),
        ),
      );
    }
    if (toRestore.length > 0) {
      ops.push(
        db
          .update(schema.expenseShares)
          .set({ status: "pending", resolvedBy: null, resolvedAt: null })
          .where(
            and(
              eq(schema.expenseShares.expenseId, expense.id),
              inArray(schema.expenseShares.userId, toRestore),
            ),
          ),
      );
    }
    if (toExclude.length > 0) {
      ops.push(
        db
          .update(schema.expenseShares)
          .set({ status: "excluded", amount: 0, resolvedBy: actorId, resolvedAt: new Date() })
          .where(
            and(
              eq(schema.expenseShares.expenseId, expense.id),
              inArray(schema.expenseShares.userId, toExclude),
            ),
          ),
      );
    }
    await Promise.all(ops);
    const n = mine.filter((s) => s.status !== "excluded").length + toInsert.length + toRestore.length - toExclude.length;
    await redistributeShares(db, expense, actorId, {
      title: `「${expense.title}」の割り勘対象が変更されました`,
      body: `イベント参加者の変更により ${n} 人で割り直し`,
    });
    changed++;
  }
  return changed;
}

// メンバーが企画から退会したときに、その人の分担を対象外(¥0)にして残りで割り直す。
// 立替者としての記録は残る(立て替えた分は精算で受け取れる)。戻り値は割り直した費用の件数
export async function excludeMemberFromAllExpenses(
  db: Db,
  tripId: string,
  userId: string,
  actorId: string,
): Promise<number> {
  const rows = await db
    .select({
      expense: schema.expenses,
      status: schema.expenseShares.status,
    })
    .from(schema.expenseShares)
    .innerJoin(schema.expenses, eq(schema.expenses.id, schema.expenseShares.expenseId))
    .where(and(eq(schema.expenses.tripId, tripId), eq(schema.expenseShares.userId, userId)));
  const targets = rows.filter((r) => r.status !== "excluded");
  if (targets.length === 0) return 0;
  await db
    .update(schema.expenseShares)
    .set({ status: "excluded", amount: 0, resolvedBy: actorId, resolvedAt: new Date() })
    .where(
      and(
        inArray(
          schema.expenseShares.expenseId,
          targets.map((r) => r.expense.id),
        ),
        eq(schema.expenseShares.userId, userId),
      ),
    );
  for (const r of targets) {
    await redistributeShares(db, r.expense, actorId, {
      title: `「${r.expense.title}」の割り勘額が変更されました`,
      body: "退会したメンバーの分を残りで割り直しました",
    });
  }
  return targets.length;
}
