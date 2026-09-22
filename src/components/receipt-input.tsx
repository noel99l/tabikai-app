"use client";

import { useEffect, useRef, useState } from "react";
import {
  RECEIPT_MAX_PER_EXPENSE,
  RECEIPT_MAX_PER_SUBMIT,
  blobToBase64,
  compressReceipt,
  fmtBytes,
} from "@/lib/receipt-image";
import { labelCls } from "./ui";

type NewFile = { key: string; preview: string; data: string; before: number; after: number };

// 領収書画像の添付欄(複数枚)。選んだ画像を端末側で圧縮し、base64 を hidden input で載せる。
// 既存画像(existingIds)は個別に削除でき、削除分は removeReceiptIds で送る。
export function ReceiptInput({
  existingIds = [],
  idPrefix,
}: {
  existingIds?: string[];
  idPrefix: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<NewFile[]>([]);
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  // プレビュー用の object URL を解放
  useEffect(() => {
    return () => {
      for (const f of files) URL.revokeObjectURL(f.preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kept = existingIds.filter((id) => !removed.has(id));
  const total = kept.length + files.length;

  const pick = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setError(null);
    const picked = [...list];
    if (files.length + picked.length > RECEIPT_MAX_PER_SUBMIT) {
      setError(`一度に追加できるのは${RECEIPT_MAX_PER_SUBMIT}枚までです`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (total + picked.length > RECEIPT_MAX_PER_EXPENSE) {
      setError(`領収書は1つの費用に${RECEIPT_MAX_PER_EXPENSE}枚までです`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setBusy(true);
    try {
      const added: NewFile[] = [];
      for (const file of picked) {
        const { blob } = await compressReceipt(file);
        const data = await blobToBase64(blob);
        added.push({
          key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          preview: URL.createObjectURL(blob),
          data,
          before: file.size,
          after: blob.size,
        });
      }
      setFiles((prev) => [...prev, ...added]);
    } catch (e) {
      setError((e as Error).message || "画像を読み込めませんでした");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeNew = (key: string) => {
    setFiles((prev) => {
      const f = prev.find((x) => x.key === key);
      if (f) URL.revokeObjectURL(f.preview);
      return prev.filter((x) => x.key !== key);
    });
  };

  const inputId = `${idPrefix}-receipt`;
  const canAdd = total < RECEIPT_MAX_PER_EXPENSE && files.length < RECEIPT_MAX_PER_SUBMIT;

  return (
    <div>
      <label className={labelCls} htmlFor={inputId}>
        領収書(任意・{RECEIPT_MAX_PER_EXPENSE}枚まで)
      </label>
      <input
        ref={fileRef}
        id={inputId}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => pick(e.target.files)}
      />
      {/* サーバーへ送る値: 新規は圧縮済み base64、既存の削除は ID */}
      {files.map((f) => (
        <span key={f.key}>
          <input type="hidden" name="receiptData" value={f.data} />
          <input type="hidden" name="receiptMime" value="image/jpeg" />
        </span>
      ))}
      {[...removed].map((id) => (
        <input key={id} type="hidden" name="removeReceiptIds" value={id} />
      ))}

      {total > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {kept.map((id) => (
            <figure key={id} className="relative rounded-[12px] border-2 border-line bg-white p-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/receipts/${id}`}
                alt="領収書"
                className="h-24 w-full rounded-lg object-cover"
              />
              <figcaption className="mt-1 truncate text-center text-[10px] text-muted">登録済み</figcaption>
              <button
                type="button"
                onClick={() => setRemoved((prev) => new Set(prev).add(id))}
                disabled={busy}
                aria-label="この領収書を削除"
                className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-line bg-accent-soft text-[11px] font-bold text-accent disabled:opacity-50"
              >
                ✕
              </button>
            </figure>
          ))}
          {files.map((f) => (
            <figure key={f.key} className="relative rounded-[12px] border-2 border-primary bg-white p-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.preview} alt="領収書(追加)" className="h-24 w-full rounded-lg object-cover" />
              <figcaption className="mt-1 truncate text-center text-[10px] text-muted">
                {fmtBytes(f.before)} → {fmtBytes(f.after)}
              </figcaption>
              <button
                type="button"
                onClick={() => removeNew(f.key)}
                disabled={busy}
                aria-label="この領収書を取り消す"
                className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-line bg-accent-soft text-[11px] font-bold text-accent disabled:opacity-50"
              >
                ✕
              </button>
            </figure>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy || !canAdd}
        className={`flex w-full items-center justify-center gap-2 rounded-[12px] border-2 border-dashed border-line bg-white px-3 py-3 text-[12.5px] font-bold text-muted disabled:opacity-50 ${
          total > 0 ? "mt-2" : ""
        }`}
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
        {busy ? "圧縮中…" : total > 0 ? "写真を追加する" : "写真を撮る / 選ぶ(複数可)"}
      </button>
      <p className="mx-0.5 mt-1.5 text-[11px] text-muted">
        画像は端末で縮小・圧縮してから保存されます(1枚あたり数百KB程度)。一度に追加できるのは{RECEIPT_MAX_PER_SUBMIT}枚までです。
      </p>
      {error && <p className="mx-0.5 mt-1 text-[11.5px] font-bold text-primary">{error}</p>}
    </div>
  );
}
