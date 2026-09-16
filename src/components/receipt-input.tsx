"use client";

import { useEffect, useRef, useState } from "react";
import { blobToBase64, compressReceipt, fmtBytes } from "@/lib/receipt-image";
import { labelCls } from "./ui";

// 領収書画像の添付欄。選んだ画像を端末側で圧縮し、base64をhidden inputでフォームに載せる。
// 既存画像(existingId)がある場合は差し替え・削除もここから行う。
export function ReceiptInput({
  existingId = null,
  idPrefix,
}: {
  existingId?: string | null;
  idPrefix: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [data, setData] = useState<string | null>(null);
  const [size, setSize] = useState<{ before: number; after: number } | null>(null);
  const [removed, setRemoved] = useState(false);

  // プレビュー用のobject URLを解放
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const { blob } = await compressReceipt(file);
      const b64 = await blobToBase64(blob);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(blob));
      setData(b64);
      setSize({ before: file.size, after: blob.size });
      setRemoved(false);
    } catch (e) {
      setError((e as Error).message || "画像を読み込めませんでした");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const clear = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setData(null);
    setSize(null);
    // 既存画像がある状態で消したら「削除」として送る
    if (existingId) setRemoved(true);
  };

  const showExisting = !!existingId && !removed && !preview;
  const inputId = `${idPrefix}-receipt`;

  return (
    <div>
      <label className={labelCls} htmlFor={inputId}>
        領収書(任意)
      </label>
      <input
        ref={fileRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {/* サーバーへ送る値(圧縮済みbase64) */}
      <input type="hidden" name="receiptData" value={data ?? ""} />
      <input type="hidden" name="receiptMime" value={data ? "image/jpeg" : ""} />
      {removed && !data && <input type="hidden" name="removeReceipt" value="on" />}

      {preview || showExisting ? (
        <div className="rounded-[12px] border-2 border-line bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview ?? `/api/receipts/${existingId}`}
            alt="領収書"
            className="mx-auto max-h-44 rounded-lg object-contain"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted">
              {size
                ? `${fmtBytes(size.before)} → ${fmtBytes(size.after)} に圧縮`
                : "登録済みの領収書"}
            </span>
            <span className="flex gap-1.5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="rounded-full border-2 border-line bg-white px-2.5 py-1 text-[11px] font-bold text-primary disabled:opacity-50"
              >
                差し替え
              </button>
              <button
                type="button"
                onClick={clear}
                disabled={busy}
                className="rounded-full border-2 border-line bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-accent disabled:opacity-50"
              >
                削除
              </button>
            </span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-[12px] border-2 border-dashed border-line bg-white px-3 py-3 text-[12.5px] font-bold text-muted disabled:opacity-50"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden
          >
            <path d="M4 7h3l2-3h6l2 3h3v13H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          {busy ? "圧縮中…" : "写真を撮る / 選ぶ"}
        </button>
      )}
      <p className="mx-0.5 mt-1.5 text-[11px] text-muted">
        画像は端末で縮小・圧縮してから保存されます(数百KB程度)。
      </p>
      {error && <p className="mx-0.5 mt-1 text-[11.5px] font-bold text-primary">{error}</p>}
    </div>
  );
}
