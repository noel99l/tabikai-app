import Link from "next/link";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { schema } from "@/db";
import { AppHeader } from "@/components/app-header";
import { IconBack } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { Avatar, Card, Pill, SectionTitle, btnCls } from "@/components/ui";
import { updateThanksBudget } from "@/lib/actions/thanks";
import { fmtDateLabel, fmtDateTime } from "@/lib/format";
import { getApprovedMembers, requireTripContext } from "@/lib/session";
import { thanksClosed } from "@/lib/thanks";

// 管理者向け: ありがとうポイントの集計(誰が何ポイント獲得したか)と手持ちの設定
export default async function ManageThanksPage() {
  const { trip, isAdmin, db } = await requireTripContext();
  if (!isAdmin) redirect("/home");
  const [members, all] = await Promise.all([
    getApprovedMembers(),
    db.query.thanksPoints.findMany({
      where: eq(schema.thanksPoints.tripId, trip.id),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    }),
  ]);
  const memberOf = (id: string) => members.find((m) => m.userId === id);
  const nameOf = (id: string) => memberOf(id)?.name ?? "退会メンバー";

  const ranking = members
    .map((m) => {
      const recv = all.filter((t) => t.toUserId === m.userId);
      const sent = all.filter((t) => t.fromUserId === m.userId);
      return {
        ...m,
        received: recv.reduce((s, t) => s + t.points, 0),
        receivedCount: recv.length,
        sent: sent.reduce((s, t) => s + t.points, 0),
      };
    })
    .sort((a, b) => b.received - a.received || b.receivedCount - a.receivedCount || a.name.localeCompare(b.name, "ja"));
  const total = all.reduce((s, t) => s + t.points, 0);
  const senders = new Set(all.map((t) => t.fromUserId)).size;
  const closed = thanksClosed(trip);

  return (
    <>
      <AppHeader title="ありがとうポイント" />
      <Link
        href="/manage"
        className="mb-2 flex items-center gap-1 text-[13px] font-bold text-primary"
      >
        <IconBack className="h-4 w-4" />
        管理者コンソールへ戻る
      </Link>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <Card className="p-3">
          <div className="text-[11px] text-muted">送られたポイント合計</div>
          <div className="text-xl font-extrabold tabular-nums">
            {total}
            <span className="ml-1 text-[12px] font-bold text-muted">pt · {all.length}件</span>
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] text-muted">送った人 / メンバー</div>
          <div className="text-xl font-extrabold tabular-nums">
            {senders}
            <span className="ml-1 text-[12px] font-bold text-muted">/ {members.length}人</span>
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-sm font-bold">手持ちポイント(1人あたり)</h3>
        <p className="mt-1 mb-2 text-[11.5px] text-muted">
          各メンバーが送れる合計ポイントです。すでに送った分より少なくはできません。
        </p>
        <form action={updateThanksBudget} className="flex items-center gap-2">
          <input
            className="w-24 shrink-0 rounded-[10px] border-2 border-line bg-white px-2 py-2.5 text-center text-sm"
            name="thanksBudget"
            type="number"
            min={0}
            max={1000}
            defaultValue={trip.thanksBudget}
            required
          />
          <span className="shrink-0 text-[13px] text-muted">pt</span>
          <SubmitButton className={`${btnCls} ml-auto shrink-0`}>保存</SubmitButton>
        </form>
        <p className="mt-2 text-[11px] text-muted">
          受け取った分は本人にすぐ表示されます。送付の受付は企画終了({fmtDateLabel(trip.endsAt)})と同時に締め切り、手元に残ったポイントは消滅します
          {closed ? "(締め切り済み)" : ""}。匿名で送られた分も管理者には送り主が表示されます。
        </p>
      </Card>

      <SectionTitle>獲得ポイント(多い順)</SectionTitle>
      {ranking.map((m, i) => (
        <Card key={m.userId} className="mb-2 flex items-center gap-3 py-2.5">
          <span className="w-5 shrink-0 text-center text-[12px] font-bold text-muted tabular-nums">
            {m.received > 0 ? i + 1 : "–"}
          </span>
          <Avatar name={m.name} emoji={m.avatarEmoji} image={m.avatarImage} size={30} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-bold">{m.name}</div>
            <div className="text-[10.5px] text-muted">
              受け取り {m.receivedCount}件 · 送った {m.sent} / {trip.thanksBudget}pt
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-extrabold tabular-nums">
              {m.received}
              <span className="ml-0.5 text-[11px] font-bold text-muted">pt</span>
            </div>
          </div>
        </Card>
      ))}

      <SectionTitle>すべてのメッセージ({all.length})</SectionTitle>
      {all.length === 0 ? (
        <p className="mx-0.5 text-[12px] text-muted">まだ送られたポイントはありません。</p>
      ) : (
        <details className="rounded-[14px] border-2 border-line bg-white p-3.5 shadow-[3px_3px_0_var(--color-line)]">
          <summary className="cursor-pointer text-[13px] font-bold">一覧を開く</summary>
          <div className="mt-2 flex flex-col gap-2.5">
            {all.map((t) => (
              <div key={t.id} className="border-t border-line pt-2">
                <div className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
                  <span className="font-bold">{nameOf(t.fromUserId)}</span>
                  {t.anonymous && <Pill tone="info">匿名</Pill>}
                  <span className="text-muted">→</span>
                  <span className="font-bold">{nameOf(t.toUserId)}</span>
                  <Pill tone="violet">{t.points}pt</Pill>
                  <span className="ml-auto text-[10.5px] text-muted">{fmtDateTime(t.createdAt)}</span>
                </div>
                {t.message ? (
                  <p className="mt-1 text-[12.5px] leading-relaxed break-words whitespace-pre-wrap">
                    {t.message}
                  </p>
                ) : (
                  <p className="mt-1 text-[11.5px] text-muted">(コメントなし)</p>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
