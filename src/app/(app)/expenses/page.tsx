import { IconPlus } from "@/components/icons";
import { AppHeader, Card, Pill, SectionTitle } from "@/components/ui";
import { sampleExpenses, yen } from "@/lib/sample-data";

// 費用一覧(Walicaベース)
export default function ExpensesPage() {
  const total = sampleExpenses.reduce((s, x) => s + x.amount, 0);
  return (
    <>
      <AppHeader title="費用" />

      <div className="mb-3 grid grid-cols-2 gap-2">
        <Card className="p-3">
          <div className="text-[11px] text-muted">グループ合計</div>
          <div className="text-xl font-extrabold tabular-nums">{yen(total)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] text-muted">あなたの負担(確定分)</div>
          <div className="text-xl font-extrabold tabular-nums">{yen(3850)}</div>
        </Card>
      </div>

      {sampleExpenses.map((x) => (
        <Card key={x.id} className="mb-2.5 flex items-center justify-between gap-2.5">
          <div className="min-w-0">
            <div className="text-sm font-bold">
              {x.title}{" "}
              {x.splitAll ? (
                <>
                  <Pill tone="violet">全員</Pill> <Pill tone="ok">確定</Pill>
                </>
              ) : (
                <Pill tone="pend">
                  承認 {x.approved}/{x.total}
                </Pill>
              )}
            </div>
            <div className="text-[11.5px] text-muted">
              立替: {x.paidBy}
              {x.splitAll
                ? ` · 1人あたり ${yen(Math.round(x.amount / 25))} · 承認不要`
                : ` · ${x.event} · 対象${x.total}人`}
            </div>
          </div>
          <div className="shrink-0 text-base font-extrabold tabular-nums">
            {yen(x.amount)}
          </div>
        </Card>
      ))}

      <SectionTitle>精算</SectionTitle>
      <Card className="border-dashed">
        <div className="text-sm font-bold">
          精算 <Pill tone="info">締め後に表示</Pill>
        </div>
        <p className="mt-1 mb-2 text-xs text-muted">
          管理者が経費入力を締め切ると、あなたの支払い先と金額がここに表示されます。
        </p>
        <div className="rounded-lg bg-screen px-2.5 py-2 text-[12.5px]">
          表示例: <b className="tabular-nums">ゆうすけ さんへ ¥2,150 を支払う</b>
        </div>
      </Card>

      <button
        aria-label="費用を追加"
        className="fixed right-4 bottom-24 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40"
      >
        <IconPlus className="h-6 w-6" strokeWidth={2.4} />
      </button>
    </>
  );
}
