import { and, eq, isNull, lt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { isAuthorizedCron } from "@/lib/cron";
import { yen } from "@/lib/format";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";

// 24時間以上未承認の割り勘に、本人へ催促+主催者/管理者へエスカレーションを送る。
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = await getDb();
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // 24h以上前に作られ、まだ pending で、未催促の share
  const shares = await db.query.expenseShares.findMany({
    where: and(
      eq(schema.expenseShares.status, "pending"),
      isNull(schema.expenseShares.nudgedAt),
      lt(schema.expenseShares.createdAt, dayAgo),
    ),
  });

  let nudged = 0;
  for (const s of shares) {
    const expense = await db.query.expenses.findFirst({
      where: eq(schema.expenses.id, s.expenseId),
    });
    if (!expense) continue;

    // 本人への催促
    await notify(db, expense.tripId, [s.userId], {
      type: "approval_nudge",
      title: `「${expense.title}」が24時間未承認です`,
      body: `あなたの負担予定 ${yen(s.amount)} · 内容を確認して承認してください`,
      link: "/expenses?tab=approvals",
    });

    // 主催者(関連イベントがある場合)+管理者へエスカレーション
    const escalateTo = new Set<string>();
    if (expense.eventId) {
      const event = await db.query.events.findFirst({
        where: eq(schema.events.id, expense.eventId),
      });
      if (event) escalateTo.add(event.hostId);
    }
    const admins = await db.query.tripMembers.findMany({
      where: and(
        eq(schema.tripMembers.tripId, expense.tripId),
        eq(schema.tripMembers.role, "admin"),
      ),
    });
    admins.forEach((a) => escalateTo.add(a.userId));
    escalateTo.delete(s.userId);

    if (escalateTo.size > 0) {
      await notify(db, expense.tripId, [...escalateTo], {
        type: "approval_escalation",
        title: `「${expense.title}」が24時間未承認です`,
        body: "承認状況を操作できます(承認として確定/対象から外す)",
        link: "/expenses?tab=approvals",
      });
    }

    await db
      .update(schema.expenseShares)
      .set({ nudgedAt: now })
      .where(
        and(
          eq(schema.expenseShares.expenseId, s.expenseId),
          eq(schema.expenseShares.userId, s.userId),
        ),
      );
    nudged += 1;
  }

  return NextResponse.json({ ok: true, nudged });
}
