import { IconBack } from "./icons";

// 管理者画面の CSV ダウンロードリンク(通常のリンク遷移でファイルを保存させる)
export function CsvDownload({ kind, label }: { kind: string; label: string }) {
  return (
    <a
      href={`/api/export/${kind}`}
      download
      className="inline-flex items-center gap-1.5 rounded-full border-2 border-line bg-white px-3 py-1.5 text-[11.5px] font-bold text-ink shadow-[2px_2px_0_var(--color-line)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
    >
      <IconBack className="h-3.5 w-3.5 -rotate-90" />
      {label}
    </a>
  );
}
