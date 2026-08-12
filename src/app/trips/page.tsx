import Link from "next/link";
import { IconPlus, IconSuitcase } from "@/components/icons";
import { Pill } from "@/components/ui";

// ログイン後トップ: 参加中のイベント(企画)を選択
export default function TripsPage() {
  return (
    <div className="mx-auto min-h-dvh max-w-md px-4">
      <div className="pt-10 pb-4 text-center">
        <h1 className="text-xl font-bold">イベントを選択</h1>
        <p className="mt-1 text-[12.5px] text-muted">参加中のイベント(企画)</p>
      </div>

      <Link
        href="/"
        className="mb-2.5 flex w-full items-center gap-3 rounded-xl border border-line bg-white p-3.5 text-left"
      >
        <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px] bg-primary-soft">
          <IconSuitcase className="h-7 w-7 text-primary" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-extrabold">突然の旅会2026</span>
          <span className="block text-[11.5px] text-muted">
            2026/10/10 – 10/11 · 参加25人
          </span>
        </span>
        <Pill tone="info">開催予定</Pill>
      </Link>

      <div className="mb-2.5 flex w-full items-center gap-3 rounded-xl border border-line bg-white p-3.5 opacity-60">
        <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px] bg-line">
          <IconSuitcase className="h-7 w-7 text-muted" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-extrabold">突然の旅会2025</span>
          <span className="block text-[11.5px] text-muted">
            2025/11/8 – 11/9 · 参加22人
          </span>
        </span>
        <Pill tone="ok">終了</Pill>
      </div>

      <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line p-3.5 text-[13.5px] font-bold text-primary">
        <IconPlus className="h-4 w-4" />
        新しいイベントを作成(管理者)
      </button>
    </div>
  );
}
