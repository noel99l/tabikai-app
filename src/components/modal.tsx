"use client";

import { useEffect, type ReactNode } from "react";

// 画面下からせり上がるボトムシート型モーダル
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      {/* モバイル: 下からのボトムシート / PC(sm以上): 中央ダイアログ */}
      <div className="relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t-[3px] border-line bg-screen px-4 pb-10 shadow-2xl sm:max-h-[85dvh] sm:rounded-2xl sm:border-[3px] sm:pb-6">
        <div className="sticky top-0 z-[2] -mx-4 flex items-center justify-between rounded-t-2xl bg-screen px-4 pt-3.5 pb-2">
          <h2 className="text-[17px] font-bold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-line bg-line-soft text-sm font-bold text-ink"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// 右下の作成FAB(モーダル起動用)
export function Fab({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="fixed right-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-10 flex h-[52px] w-[52px] items-center justify-center rounded-full border-[3px] border-line bg-primary text-white shadow-[4px_4px_0_var(--color-line)]"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );
}
