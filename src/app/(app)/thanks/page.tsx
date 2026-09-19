import { and, eq } from "drizzle-orm";
import { schema } from "@/db";
import { AppHeader } from "@/components/app-header";
import { ThanksBoard } from "@/components/thanks-board";
import { Avatar, Card, Pill } from "@/components/ui";
import { fmtDateTime, fmtTime, jstDateKey } from "@/lib/format";
import { getApprovedMembers, requireTripContext } from "@/lib/session";
import { thanksClosed, thanksPeriodEnd, thanksPeriodStart } from "@/lib/thanks";

// ありがとうポイント: 受け取ったポイントとコメント(常時表示)・送る・送った履歴
export default async function ThanksPage() {
  const { user, trip, db } = await requireTripContext();
  const [members, given, received] = await Promise.all([
    getApprovedMembers(),
    db.query.thanksPoints.findMany({
      where: and(eq(schema.thanksPoints.tripId, trip.id), eq(schema.thanksPoints.fromUserId, user.id)),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    }),
    db.query.thanksPoints.findMany({
      where: and(eq(schema.thanksPoints.tripId, trip.id), eq(schema.thanksPoints.toUserId, user.id)),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    }),
  ]);
  const memberOf = (id: string) => members.find((m) => m.userId === id);
  const closed = thanksClosed(trip);
  const now = new Date();
  const periodStart = thanksPeriodStart(now).getTime();
  const periodEnd = thanksPeriodEnd(now);
  // 次のリセット(次の4:00 JST)の表示。今日中なら「今日 4:00」、それ以外は「明日 4:00」
  const resetLabel = `${jstDateKey(periodEnd) === jstDateKey(now) ? "今日" : "明日"} ${fmtTime(periodEnd)}`;
  const receivedTotal = received.reduce((s, r) => s + r.points, 0);

  return (
    <>
      <AppHeader title="ありがとう" />

      {/* 受け取った分(常時表示) */}
      <Card className="mb-2.5 border-l-[6px] border-l-violet">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold">受け取ったありがとう</h3>
          {closed && <Pill tone="violet">企画終了</Pill>}
        </div>
        <div className="mt-1 text-2xl font-extrabold tabular-nums">
              {receivedTotal}
              <span className="ml-1 text-[12px] font-bold text-muted">pt · {received.length}件</span>
            </div>
        {received.length === 0 ? (
          <p className="mt-1 text-[12px] text-muted">まだ受け取ったポイントはありません。</p>
        ) : (
          <div className="mt-2.5 flex flex-col gap-2">
                {received.map((r) => {
                  // 匿名の場合は送り主を出さない
                  const from = r.anonymous ? null : memberOf(r.fromUserId);
                  return (
                    <div key={r.id} className="flex items-start gap-2">
                      {r.anonymous ? (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-line bg-line-soft text-[11px] font-bold text-muted">
                          ?
                        </span>
                      ) : (
                        <Avatar
                          name={from?.name ?? "?"}
                          emoji={from?.avatarEmoji}
                          image={from?.avatarImage}
                          size={28}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-[10.5px] font-bold">
                          {r.anonymous ? "匿名のメンバー" : (from?.name ?? "退会メンバー")}
                          <span className="ml-1.5 rounded-full bg-violet-soft px-1.5 py-px text-[10px] font-bold text-violet">
                            {r.points}pt
                          </span>
                          <span className="ml-1.5 font-medium text-muted">{fmtDateTime(r.createdAt)}</span>
                        </div>
                        {r.message && (
                          <div className="mt-0.5 w-fit max-w-full rounded-[4px_12px_12px_12px] border-2 border-line bg-screen px-2.5 py-1.5 text-[12.5px] leading-relaxed break-words whitespace-pre-wrap">
                            {r.message}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
          </div>
        )}
      </Card>

      <ThanksBoard
        closed={closed}
        resetLabel={resetLabel}
        budget={trip.thanksBudget}
        members={members
          .filter((m) => m.userId !== user.id)
          .map((m) => ({
            userId: m.userId,
            name: m.name,
            emoji: m.avatarEmoji,
            image: m.avatarImage,
          }))}
        given={given.map((g) => ({
          id: g.id,
          toUserId: g.toUserId,
          toName: memberOf(g.toUserId)?.name ?? "退会メンバー",
          points: g.points,
          message: g.message,
          anonymous: g.anonymous,
          timeLabel: fmtDateTime(g.createdAt),
          today: g.createdAt.getTime() >= periodStart,
        }))}
      />
    </>
  );
}
