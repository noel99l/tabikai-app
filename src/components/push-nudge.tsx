"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconBell } from "./icons";

const DISMISS_KEY = "pushNudgeDismissedAt";
const DISMISS_DAYS = 7;

// プッシュ通知が未設定の端末に、設定を促すバナーを表示する(ホーム用)。
// 「あとで」を選ぶと7日間は再表示しない。
export function PushNudge() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window) ||
      Notification.permission === "denied"
    ) {
      return;
    }
    const dismissed = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (Date.now() - dismissed < DISMISS_DAYS * 24 * 3600 * 1000) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!sub) setShow(true);
      })
      .catch(() => {});
  }, []);

  if (!show) return null;
  return (
    <div className="mb-2.5 flex items-center gap-3 rounded-[14px] border-2 border-line bg-white p-3 shadow-[3px_3px_0_var(--color-line)]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-primary-soft">
        <IconBell className="h-5 w-5 text-primary" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-bold">プッシュ通知が未設定です</p>
        <p className="text-[11px] text-muted">
          リマインドやお知らせを受け取るにはオンにしてください。
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Link
          href="/settings"
          className="rounded-full border-2 border-line bg-primary px-3 py-1.5 text-[11.5px] font-bold text-white"
        >
          設定する
        </Link>
        <button
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
            setShow(false);
          }}
          className="text-[10.5px] font-bold text-muted"
        >
          あとで
        </button>
      </div>
    </div>
  );
}
