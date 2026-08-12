import { AppHeader, Card, Pill, SectionTitle } from "@/components/ui";
import { samplePendingShares, yen } from "@/lib/sample-data";

// 費用承認: 本人承認 + 24h未承認の主催者/管理者操作
export default function ApprovalsPage() {
  return (
    <>
      <AppHeader title="承認" />
      <p className="mx-0.5 mb-2.5 text-[12.5px] text-muted">
        あなたが割り勘対象になっている費用です。内容を確認して承認してください。
      </p>

      {samplePendingShares.map((s) => (
        <Card key={s.id} className="mb-2.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-bold">{s.expense}</div>
              <div className="text-[11.5px] text-muted">
                立替: {s.paidBy} · 合計 {yen(s.total)} · 対象{s.targets}人
              </div>
            </div>
            <Pill tone="pend">承認待ち</Pill>
          </div>
          <div className="my-2 rounded-lg bg-screen px-2.5 py-2 text-[12.5px]">
            あなたの負担: <b className="tabular-nums">{yen(s.yourShare)}</b>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 rounded-lg bg-primary px-3 py-2 text-[13px] font-bold text-white">
              承認する
            </button>
            <button className="flex-1 rounded-lg bg-primary-soft px-3 py-2 text-[13px] font-bold text-primary">
              内容について質問
            </button>
          </div>
        </Card>
      ))}

      <SectionTitle>主催者・管理者の操作(24時間以上未承認)</SectionTitle>
      <Card>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-bold">タクシー(駅→宿)</div>
            <div className="text-[11.5px] text-muted">
              未承認: しょう · 催促通知 送信済み(昨日 22:10)
            </div>
          </div>
          <Pill tone="pend">放置 26時間</Pill>
        </div>
        <div className="mt-2.5 flex gap-2">
          <button className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white">
            承認として確定
          </button>
          <button className="flex-1 rounded-lg bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary">
            割り勘対象から外す
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          この操作はイベント主催者(関連イベントあり)と管理者のみ表示されます。
        </p>
      </Card>

      <SectionTitle>承認済み</SectionTitle>
      <Card className="flex items-center justify-between gap-2 opacity-65">
        <div>
          <div className="text-sm font-bold">レンタカー代</div>
          <div className="text-[11.5px] text-muted">
            立替: たくみ · あなたの負担 {yen(650)}
          </div>
        </div>
        <Pill tone="ok">承認済み</Pill>
      </Card>
    </>
  );
}
