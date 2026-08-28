"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

// 開きっぱなしのページに他メンバーの変更(イベント追加など)が反映されないため、
// アプリへ復帰したとき + 表示中は60秒ごとに Server Components を再取得する。
// router.refresh() はクライアント側の state を保持したまま最新データだけ差し替える。
const MIN_INTERVAL_MS = 15_000; // 復帰連打での多重リフレッシュ防止
const POLL_MS = 60_000;

export function AutoRefresh() {
  const router = useRouter();
  const lastRefresh = useRef(Date.now());

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastRefresh.current < MIN_INTERVAL_MS) return;
      lastRefresh.current = Date.now();
      router.refresh();
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const timer = setInterval(refresh, POLL_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      clearInterval(timer);
    };
  }, [router]);

  return null;
}
