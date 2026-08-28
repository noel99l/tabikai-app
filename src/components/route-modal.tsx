"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

// インターセプトルート用のモーダル。閉じる=router.back() で元のページへ戻る。
// パネルは下から飛び出してくるポップアニメーション(globals.css の pop-in)付き。
export function RouteModal({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const close = useCallback(() => router.back(), [router]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [close]);

  return (
    <div
      className="fixed inset-0 z-[25] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="animate-[backdrop-in_200ms_ease-out] absolute inset-0 bg-ink/40"
        onClick={close}
      />
      <div className="animate-[pop-in_360ms_cubic-bezier(0.34,1.56,0.64,1)] relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t-[3px] border-line bg-screen px-4 pb-10 shadow-2xl sm:max-h-[85dvh] sm:rounded-2xl sm:border-[3px] sm:pb-6">
        <div className="sticky top-0 z-[2] -mx-4 flex items-center justify-between rounded-t-2xl bg-screen px-4 pt-3.5 pb-2">
          <h2 className="text-[17px] font-bold">{title}</h2>
          <button
            onClick={close}
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
