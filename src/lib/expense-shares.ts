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

// excluded 以外の対象者で割り勘額を再計算する(金額編集・対象から外した時に使う)。
// 個別割り勘は再承認のため pending に戻し(立替者は承認扱い)、対象者に再確認を通知する。
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
  const active = shares.filter((s) => s.status !== "excluded");
  if (active.length === 0) return;
  const amounts = splitAmount(expense.amount, active.length);
  for (let i = 0; i < active.length; i++) {
    await db
      .update(schema.expenseShares)
      .set({
        amount: amounts[i],
        status: expense.splitAll
          ? "approved"
          : active[i].userId === expense.paidBy
            ? "approved"
            : "pending",
      })
      .where(
        and(
          eq(schema.expenseShares.expenseId, expense.id),
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
        .filter((id) => id !== actorId && id !== expense.paidBy),
      {
        type: "expense_assigned",
        title: notice.title,
        body: notice.body,
        link: "/expenses/approvals",
        senderId: actorId,
      },
    );
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
          .set({ status: "excluded", resolvedBy: actorId, resolvedAt: new Date() })
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
          .set({ status: "excluded", resolvedBy: actorId, resolvedAt: new Date() })
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
      body: `イベント参加者の変更により ${n} 人で割り直し · 再度ご確認ください`,
    });
    changed++;
  }
  return changed;
}
