"use client";

import { useEffect, useState } from "react";
import { Modal } from "./modal";
import { IconSuitcase } from "./icons";

const DISMISS_KEY = "a2hs-dismissed";

// beforeinstallprompt イベントの型(Chrome系のみ)
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform = "none" | "ios" | "android";

export function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform>("none");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosOpen, setIosOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // すでにインストール済み(スタンドアロン表示)なら出さない
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua);
    // iPadOSはMacintosh UAでタッチ対応
    const isIpadOs = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
    if (isIos || isIpadOs) {
      setPlatform("ios");
      return;
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setPlatform("android");
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setPlatform("none");
  };

  const installAndroid = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") dismiss();
    setDeferred(null);
  };

  if (platform === "none") return null;

  return (
    <>
      <div className="mb-2.5 flex items-center gap-3 rounded-[14px] border-2 border-line bg-white p-3 shadow-[3px_3px_0_var(--color-line)]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-primary-soft">
          <IconSuitcase className="h-5 w-5 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-bold">ホーム画面に追加</p>
          <p className="text-[11px] text-muted">
            アプリのように使え、プッシュ通知も受け取れます。
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <button
            onClick={platform === "android" ? installAndroid : () => setIosOpen(true)}
            className="rounded-full border-2 border-line bg-primary px-3 py-1.5 text-[11.5px] font-bold text-white"
          >
            {platform === "android" ? "追加する" : "方法を見る"}
          </button>
          <button onClick={dismiss} className="text-[10.5px] font-bold text-muted">
            あとで
          </button>
        </div>
      </div>

      <Modal open={iosOpen} onClose={() => setIosOpen(false)} title="ホーム画面に追加">
        <p className="mb-3 text-[12.5px] text-muted">
          Safari で以下の手順を行うと、アプリのように起動でき、プッシュ通知も受け取れます。
        </p>
        <ol className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-white">
              1
            </span>
            <span className="text-[13px]">
              画面下(またはアドレスバー)の
              <span className="mx-1 inline-flex items-center rounded border border-line bg-white px-1.5 py-0.5 align-middle">
                {/* 共有アイコン(iOS) */}
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-label="共有">
                  <path d="M12 3v13M12 3l-4 4M12 3l4 4" />
                  <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
                </svg>
              </span>
              <b>共有ボタン</b>をタップ
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-white">
              2
            </span>
            <span className="text-[13px]">
              メニューを下にスクロールして
              <b>「ホーム画面に追加」</b>をタップ
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-white">
              3
            </span>
            <span className="text-[13px]">
              右上の<b>「追加」</b>をタップして完了
            </span>
          </li>
        </ol>
        <p className="mt-4 rounded-lg bg-screen px-3 py-2 text-[11.5px] text-muted">
          プッシュ通知は、ホーム画面に追加したアプリから開いた場合のみ有効になります(iOS
          16.4以降)。
        </p>
        <button
          onClick={() => {
            setIosOpen(false);
            dismiss();
          }}
          className="mt-4 w-full rounded-lg bg-primary px-4 py-3 text-[13px] font-bold text-white"
        >
          追加しました / あとで
        </button>
      </Modal>
    </>
  );
}
