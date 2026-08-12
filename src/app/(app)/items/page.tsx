import { IconPlus } from "@/components/icons";
import { AppHeader, Card, Pill, SectionTitle } from "@/components/ui";
import { sampleItems } from "@/lib/sample-data";

// 持ち物リスト: 足りない / 調達予定 / 準備OK
export default function ItemsPage() {
  const missing = sampleItems.filter((i) => !i.assignee && !i.done);
  const planned = sampleItems.filter((i) => i.assignee && !i.done);
  const ready = sampleItems.filter((i) => i.done);

  return (
    <>
      <AppHeader title="持ち物リスト" />
      <p className="mx-0.5 mb-2.5 text-[12.5px] text-muted">
        イベントに必要なものを全員で共有。足りないものは「買ってくる」で買い出しのついでに調達できます。
      </p>

      <div className="mb-3 grid grid-cols-3 gap-2">
        {[
          { label: "足りない", value: missing.length, cls: "text-pend" },
          { label: "調達予定", value: planned.length, cls: "" },
          { label: "準備OK", value: ready.length, cls: "text-ok" },
        ].map((s) => (
          <Card key={s.label} className="p-3">
            <div className="text-[11px] text-muted">{s.label}</div>
            <div className={`text-xl font-extrabold ${s.cls}`}>{s.value}</div>
          </Card>
        ))}
      </div>

      <h3 className="mx-0.5 mt-3.5 mb-2 text-[13px] font-bold text-pend">足りないもの</h3>
      {missing.map((i) => (
        <Card key={i.id} className="mb-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-bold">
                {i.name} <Pill tone="info">{i.event}</Pill>
              </div>
              <div className="text-[11.5px] text-muted">
                追加: {i.addedBy}
                {i.note ? ` · ${i.note}` : ""}
              </div>
            </div>
            <Pill tone="pend">未調達</Pill>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 rounded-lg bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary">
              持っていく
            </button>
            <button className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white">
              買ってくる
            </button>
          </div>
        </Card>
      ))}
      <p className="mx-0.5 text-[11px] text-muted">
        「買ってくる」で引き受けたものは自分の買い物リストにまとまり、購入後は費用入力からそのまま精算できます。
      </p>

      <SectionTitle>調達予定</SectionTitle>
      {planned.map((i) => (
        <Card key={i.id} className="mb-2.5 flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-bold">
              {i.name} <Pill tone="violet">{i.event}</Pill>
            </div>
            <div className="text-[11.5px] text-muted">追加: {i.addedBy}</div>
          </div>
          <Pill tone="info">
            {i.assignee} が{i.method === "buy" ? "買い出し" : "持参"}
          </Pill>
        </Card>
      ))}

      <SectionTitle>準備OK</SectionTitle>
      {ready.map((i) => (
        <Card key={i.id} className="mb-2.5 flex items-center justify-between gap-2 opacity-60">
          <div>
            <div className="text-sm font-bold">
              {i.name} <Pill tone="violet">{i.event}</Pill>
            </div>
            <div className="text-[11.5px] text-muted">
              {i.assignee} が{i.method === "buy" ? "購入済み" : "持参済み"}
            </div>
          </div>
          <Pill tone="ok">準備OK</Pill>
        </Card>
      ))}

      <button
        aria-label="必要なものを追加"
        className="fixed right-4 bottom-24 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40"
      >
        <IconPlus className="h-6 w-6" strokeWidth={2.4} />
      </button>
    </>
  );
}
