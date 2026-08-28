"use client";

import { useRef, useState } from "react";
import { updateTripLogo } from "@/lib/actions/trips";
import { IconSuitcase } from "./icons";

// 画像を128px正方形にリサイズしてdataURLで保存する
async function resizeToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  // 中央クロップして正方形に
  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function LogoUpload({ logoUrl }: { logoUrl: string | null }) {
  const [preview, setPreview] = useState<string | null>(logoUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await resizeToDataUrl(file);
      const res = await updateTripLogo(dataUrl);
      if (res?.error) setError(res.error);
      else setPreview(dataUrl);
    } catch {
      setError("画像の読み込みに失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("ロゴ画像を削除しますか?")) return;
    setBusy(true);
    setError(null);
    try {
      await updateTripLogo(null);
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border-2 border-primary bg-primary-soft">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="ロゴ" className="h-full w-full object-cover" />
        ) : (
          <IconSuitcase className="h-8 w-8 text-primary" strokeWidth={1.7} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-2 text-[11.5px] text-muted">
          ダッシュボードやイベント選択画面に表示されます(正方形・自動リサイズ)。
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <div className="flex gap-2">
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {busy ? "処理中…" : preview ? "画像を変更" : "画像をアップロード"}
          </button>
          {preview && (
            <button
              onClick={remove}
              disabled={busy}
              className="rounded-lg border-2 border-line bg-line-soft px-3 py-2 text-xs font-bold text-ink disabled:opacity-50"
            >
              削除
            </button>
          )}
        </div>
        {error && <p className="mt-1.5 text-[11px] font-bold text-accent">{error}</p>}
      </div>
    </div>
  );
}
