"use client";

import { useEffect, useState } from "react";
import { sendTestPush } from "@/lib/actions/notifications";
import { useToast } from "./toast";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buffer = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type State = "loading" | "unsupported" | "off" | "on" | "denied";

export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [isIos, setIsIos] = useState(false);
  // オンにできなかった理由(Android等での原因切り分け用)
  const [enableError, setEnableError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    setIsIos(
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
        (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1),
    );
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window) ||
      !VAPID_PUBLIC_KEY
    ) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, []);

  const enable = async () => {
    setBusy(true);
    setEnableError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        if (permission !== "denied") {
          setEnableError("通知の許可がキャンセルされました。もう一度お試しください。");
        }
        return;
      }
      // SW登録に失敗していると ready が永遠に解決せず固まるため、タイムアウトを設ける
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("通知の準備がタイムアウトしました。再読み込み後にお試しください")), 10000),
        ),
      ]);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (!res.ok) {
        setEnableError(`登録に失敗しました(HTTP ${res.status})。時間をおいて再度お試しください。`);
      }
      setState(res.ok ? "on" : "off");
    } catch (err) {
      // 失敗理由を表示する(不具合報告時の切り分けに使う)
      const e = err as Error;
      setEnableError(`オンにできませんでした: ${e.name}: ${e.message}`);
      setState("off");
    } finally {
      setBusy(false);
    }
  };

  // 到達確認: 自分の端末へテスト通知を送る
  const sendTest = async () => {
    setBusy(true);
    try {
      const { subs } = await sendTestPush();
      toast.show(
        subs > 0
          ? `テスト通知を送信しました(この端末を含む${subs}件の登録へ)`
          : "この端末の通知登録が見つかりません。一度オフ→オンし直してください。",
      );
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      // 失敗しても表示は維持
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2.5 rounded-[14px] border-2 border-line bg-white p-3.5 shadow-[3px_3px_0_var(--color-line)]">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-bold">プッシュ通知</div>
          <div className="text-[11.5px] text-muted">
            イベントのリマインドや全体アナウンスを端末に通知します
          </div>
        </div>
        {state === "on" ? (
          <button
            onClick={disable}
            disabled={busy}
            className="shrink-0 rounded-lg bg-ok-soft px-3 py-2 text-xs font-bold text-ok disabled:opacity-50"
          >
            オン(タップでオフ)
          </button>
        ) : state === "off" ? (
          <button
            onClick={enable}
            disabled={busy}
            className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            通知をオンにする
          </button>
        ) : (
          <span className="shrink-0 rounded-full border-2 border-line bg-screen px-2.5 py-1 text-[11px] font-bold text-muted">
            {state === "loading"
              ? "確認中…"
              : state === "denied"
                ? "拒否中"
                : "利用できません"}
          </span>
        )}
      </div>
      {enableError && (
        <p className="mt-2.5 rounded-xl border-2 border-pend bg-pend-soft px-3 py-2.5 text-[11.5px] font-semibold text-pend">
          {enableError}
        </p>
      )}
      {state === "on" && (
        <button
          onClick={sendTest}
          disabled={busy}
          className="mt-2.5 w-full rounded-[10px] border-2 border-line bg-white py-2.5 text-[12px] font-bold text-primary disabled:opacity-50"
        >
          テスト通知を送る(この端末で受信確認)
        </button>
      )}
      {state === "denied" && (
        <p className="mt-2.5 rounded-xl border-2 border-pend bg-pend-soft px-3 py-2.5 text-[11.5px] font-semibold text-pend">
          通知がブラウザ設定で拒否されています。ブラウザのサイト設定で通知を「許可」に変更してください。iPhoneはホーム画面に追加したアプリから開く必要があります。
        </p>
      )}
      {state === "unsupported" && (
        <p className="mt-2.5 rounded-xl border-2 border-pend bg-pend-soft px-3 py-2.5 text-[11.5px] font-semibold text-pend">
          {isIos
            ? "このブラウザからは通知を受け取れません。「ホーム画面に追加」したアプリから開き直すと、ここで通知をオンにできます(iOS 16.4以降)。追加のやり方はホーム画面のバナー「方法を見る」からご覧いただけます。"
            : "このブラウザはプッシュ通知に対応していません。ChromeやEdgeなどの対応ブラウザでお試しください。"}
        </p>
      )}
    </div>
  );
}
