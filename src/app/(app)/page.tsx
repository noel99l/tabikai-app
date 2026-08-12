import Link from "next/link";
import { IconSuitcase } from "@/components/icons";
import { AppHeader, Card, Pill, SectionTitle } from "@/components/ui";
import {
  samplePendingShares,
  sampleTrip,
  yen,
} from "@/lib/sample-data";

// ダッシュボード: イベントロゴ / 次の予定 / 未承認のコスト
export default function DashboardPage() {
  const pendingTotal = samplePendingShares.reduce((s, x) => s + x.yourShare, 0);
  return (
    <>
      <AppHeader title="ホーム" />

      <Card className="flex flex-col items-center py-5 text-center">
        <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[20px] border-2 border-primary bg-primary-soft">
          <IconSuitcase className="h-9 w-9 text-primary" strokeWidth={1.7} />
        </span>
        <div className="mt-2.5 text-lg font-extrabold">{sampleTrip.name}</div>
        <div className="text-xs text-muted">
          2026/10/10 15:00 – 10/11 12:00 · 参加{sampleTrip.memberCount}人
        </div>
        <Link
          href="/trips"
          className="mt-2.5 rounded-lg bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary"
        >
          イベントを切り替え
        </Link>
      </Card>

      <SectionTitle>次の予定</SectionTitle>
      <Card className="border-l-4 border-l-violet">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-bold">集合写真</div>
            <div className="text-[11.5px] text-muted">
              19:30 – 20:00 · ロビー · 参加登録済み
            </div>
          </div>
          <Pill tone="pend">あと5分</Pill>
        </div>
        <div className="mt-2.5 flex gap-2">
          <Link
            href="/schedule"
            className="flex-1 rounded-lg bg-primary px-3 py-2 text-center text-xs font-bold text-white"
          >
            詳細を見る
          </Link>
          <Link
            href="/schedule"
            className="flex-1 rounded-lg bg-primary-soft px-3 py-2 text-center text-xs font-bold text-primary"
          >
            予定表へ
          </Link>
        </div>
      </Card>
      <Card className="mt-2.5 opacity-75">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-bold">ボードゲーム大会</div>
            <div className="text-[11.5px] text-muted">21:00 – 22:30 · 大広間</div>
          </div>
          <Pill tone="info">招待あり</Pill>
        </div>
      </Card>

      <SectionTitle>未承認のコスト</SectionTitle>
      <Card>
        {samplePendingShares.map((s) => (
          <div key={s.id} className="mb-2.5 flex items-center justify-between gap-2">
            <div>
              <div className="text-[13.5px] font-bold">{s.expense}</div>
              <div className="text-[11.5px] text-muted">
                あなたの負担 {yen(s.yourShare)}
              </div>
            </div>
            <Pill tone="pend">承認待ち</Pill>
          </div>
        ))}
        <Link
          href="/approvals"
          className="block w-full rounded-lg bg-primary px-3 py-2.5 text-center text-[13px] font-bold text-white"
        >
          承認画面へ({samplePendingShares.length}件 · 合計 {yen(pendingTotal)})
        </Link>
      </Card>
    </>
  );
}
