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

// ios-inapp: DiscordやXなどアプリ内ブラウザ(そのままでは追加できない)
// ios-safari: Safari / ios-browser: iOS版Chrome・Edge等(共有メニューから追加可)
// android: beforeinstallprompt が使える環境 / android-inapp: アプリ内ブラウザ
type Platform =
  | "none"
  | "ios-safari"
  | "ios-browser"
  | "ios-inapp"
  | "android"
  | "android-inapp";

// ---- 手順の図解(ステッカーポップ調のイラスト) ----

const illustFrame =
  "w-full rounded-xl border-2 border-line bg-screen p-2";

// アプリ内ブラウザ: 「…」メニュー → ブラウザで開く
function IllustOpenInBrowser() {
  return (
    <div className={illustFrame}>
      <svg viewBox="0 0 300 96" className="w-full" aria-hidden>
        {/* ブラウザ上部バー */}
        <rect x="4" y="6" width="292" height="30" rx="8" fill="#fff" stroke="#1b1b1b" strokeWidth="2" />
        <rect x="40" y="13" width="180" height="16" rx="8" fill="#f6f1de" stroke="#1b1b1b" strokeWidth="1.5" />
        <text x="130" y="25" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#8a8a8a">tabikai.app</text>
        <text x="18" y="27" fontSize="14" fontWeight="bold" fill="#1b1b1b">‹</text>
        {/* 「…」を強調 */}
        <circle cx="266" cy="21" r="13" fill="#ffe9e4" stroke="#ff4d2e" strokeWidth="2.5" />
        <circle cx="259" cy="21" r="1.8" fill="#1b1b1b" />
        <circle cx="266" cy="21" r="1.8" fill="#1b1b1b" />
        <circle cx="273" cy="21" r="1.8" fill="#1b1b1b" />
        {/* メニュー */}
        <rect x="150" y="46" width="146" height="40" rx="10" fill="#fff" stroke="#1b1b1b" strokeWidth="2" />
        <rect x="156" y="52" width="134" height="28" rx="7" fill="#ffe9e4" stroke="#ff4d2e" strokeWidth="2" />
        <text x="223" y="70" textAnchor="middle" fontSize="11.5" fontWeight="bold" fill="#ff4d2e">ブラウザで開く</text>
        {/* 矢印 */}
        <path d="M262 36 L250 50" stroke="#ff4d2e" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M250 50 l7 -1 M250 50 l1 -7" stroke="#ff4d2e" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// Safari: 下部ツールバーの共有ボタン
function IllustSafariShare() {
  return (
    <div className={illustFrame}>
      <svg viewBox="0 0 300 72" className="w-full" aria-hidden>
        {/* アドレスバー+下部バー */}
        <rect x="4" y="6" width="292" height="24" rx="8" fill="#fff" stroke="#1b1b1b" strokeWidth="2" />
        <text x="150" y="22" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#8a8a8a">tabikai.app</text>
        <rect x="4" y="38" width="292" height="28" rx="8" fill="#fff" stroke="#1b1b1b" strokeWidth="2" />
        <text x="40" y="58" fontSize="14" fontWeight="bold" fill="#8a8a8a">‹</text>
        <text x="90" y="58" fontSize="14" fontWeight="bold" fill="#8a8a8a">›</text>
        {/* 共有ボタンを強調 */}
        <circle cx="150" cy="52" r="12" fill="#ffe9e4" stroke="#ff4d2e" strokeWidth="2.5" />
        <g stroke="#ff4d2e" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M150 45.5v8M150 45.5l-3 3M150 45.5l3 3" />
          <path d="M145 51.5v5.5h10v-5.5" />
        </g>
        <rect x="200" y="45" width="14" height="14" rx="3" fill="none" stroke="#8a8a8a" strokeWidth="2" />
        <rect x="248" y="45" width="14" height="14" rx="3" fill="none" stroke="#8a8a8a" strokeWidth="2" />
        <rect x="252" y="41" width="14" height="14" rx="3" fill="#fff" stroke="#8a8a8a" strokeWidth="2" />
      </svg>
    </div>
  );
}

// iOS版Chrome等: アドレスバー右の共有ボタン
function IllustChromeShare() {
  return (
    <div className={illustFrame}>
      <svg viewBox="0 0 300 44" className="w-full" aria-hidden>
        <rect x="4" y="6" width="292" height="32" rx="16" fill="#fff" stroke="#1b1b1b" strokeWidth="2" />
        <text x="130" y="27" textAnchor="middle" fontSize="10.5" fontWeight="bold" fill="#8a8a8a">tabikai.app</text>
        {/* 共有ボタンを強調 */}
        <circle cx="264" cy="22" r="13" fill="#ffe9e4" stroke="#ff4d2e" strokeWidth="2.5" />
        <g stroke="#ff4d2e" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M264 15v8M264 15l-3 3M264 15l3 3" />
          <path d="M259 21v5.5h10V21" />
        </g>
      </svg>
    </div>
  );
}

// 共有メニュー内の「ホーム画面に追加」
function IllustAddToHome() {
  return (
    <div className={illustFrame}>
      <svg viewBox="0 0 300 78" className="w-full" aria-hidden>
        <rect x="4" y="4" width="292" height="70" rx="12" fill="#fff" stroke="#1b1b1b" strokeWidth="2" />
        {/* コピー行(グレー) */}
        <text x="20" y="26" fontSize="11" fontWeight="bold" fill="#8a8a8a">コピー</text>
        <rect x="262" y="14" width="16" height="16" rx="3" fill="none" stroke="#8a8a8a" strokeWidth="2" />
        <line x1="12" y1="38" x2="288" y2="38" stroke="#eee5cf" strokeWidth="2" />
        {/* ホーム画面に追加を強調 */}
        <rect x="10" y="42" width="280" height="26" rx="7" fill="#ffe9e4" stroke="#ff4d2e" strokeWidth="2" />
        <text x="20" y="59" fontSize="11.5" fontWeight="bold" fill="#ff4d2e">ホーム画面に追加</text>
        <rect x="262" y="47" width="16" height="16" rx="4" fill="none" stroke="#ff4d2e" strokeWidth="2" />
        <path d="M270 51v8M266 55h8" stroke="#ff4d2e" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// Android Chrome: 「⋮」メニュー → ホーム画面に追加
function IllustAndroidMenu() {
  return (
    <div className={illustFrame}>
      <svg viewBox="0 0 300 96" className="w-full" aria-hidden>
        <rect x="4" y="6" width="292" height="30" rx="8" fill="#fff" stroke="#1b1b1b" strokeWidth="2" />
        <rect x="16" y="13" width="210" height="16" rx="8" fill="#f6f1de" stroke="#1b1b1b" strokeWidth="1.5" />
        <text x="121" y="25" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#8a8a8a">tabikai.app</text>
        {/* 「⋮」を強調 */}
        <circle cx="272" cy="21" r="13" fill="#ffe9e4" stroke="#ff4d2e" strokeWidth="2.5" />
        <circle cx="272" cy="14.5" r="1.8" fill="#1b1b1b" />
        <circle cx="272" cy="21" r="1.8" fill="#1b1b1b" />
        <circle cx="272" cy="27.5" r="1.8" fill="#1b1b1b" />
        {/* メニュー */}
        <rect x="130" y="46" width="166" height="40" rx="10" fill="#fff" stroke="#1b1b1b" strokeWidth="2" />
        <rect x="136" y="52" width="154" height="28" rx="7" fill="#ffe9e4" stroke="#ff4d2e" strokeWidth="2" />
        <text x="213" y="70" textAnchor="middle" fontSize="11.5" fontWeight="bold" fill="#ff4d2e">ホーム画面に追加</text>
        <path d="M268 36 L256 50" stroke="#ff4d2e" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M256 50 l7 -1 M256 50 l1 -7" stroke="#ff4d2e" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// 手順1行(番号+説明+図解)
function Step({
  n,
  children,
  illust,
}: {
  n: number;
  children: React.ReactNode;
  illust?: React.ReactNode;
}) {
  return (
    <li>
      <div className="flex items-start gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-white">
          {n}
        </span>
        <span className="text-[13px]">{children}</span>
      </div>
      {illust && <div className="mt-2 ml-9">{illust}</div>}
    </li>
  );
}

export function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform>("none");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // すでにインストール済み(スタンドアロン表示)なら出さない
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const ua = navigator.userAgent;
    const isIos =
      /iphone|ipad|ipod/i.test(ua) ||
      // iPadOSはMacintosh UAでタッチ対応
      (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    // Discord・X(Twitter)・LINE・Instagram・Facebook等のアプリ内ブラウザ
    const isInAppUa = /(discord|twitter|line\/|instagram|fban|fbav|fb_iab|micromessenger)/i.test(ua);

    if (isIos) {
      // iOSのWebView(アプリ内ブラウザ)はUAに "Safari" を含まない
      const isWebView = !/safari/i.test(ua);
      if (isInAppUa || isWebView) setPlatform("ios-inapp");
      else if (/crios|fxios|edgios/i.test(ua)) setPlatform("ios-browser");
      else setPlatform("ios-safari");
      return;
    }

    // Androidのアプリ内ブラウザ(WebView)は beforeinstallprompt が使えない
    if (/android/i.test(ua) && (isInAppUa || /; wv\)/i.test(ua))) {
      setPlatform("android-inapp");
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

  const isInApp = platform === "ios-inapp" || platform === "android-inapp";

  return (
    <>
      <div className="mb-2.5 flex items-center gap-3 rounded-[14px] border-2 border-line bg-white p-3 shadow-[3px_3px_0_var(--color-line)]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-primary-soft">
          <IconSuitcase className="h-5 w-5 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-bold">ホーム画面に追加</p>
          <p className="text-[11px] text-muted">
            {isInApp
              ? "アプリ内ブラウザで開いています。ブラウザから追加できます。"
              : "アプリのように使え、プッシュ通知も受け取れます。"}
          </p>
        </div>
        <button
          onClick={platform === "android" ? installAndroid : () => setGuideOpen(true)}
          className="shrink-0 rounded-full border-2 border-line bg-primary px-3 py-1.5 text-[11.5px] font-bold text-white"
        >
          {platform === "android" ? "追加する" : "方法を見る"}
        </button>
        <button onClick={dismiss} aria-label="閉じる" className="shrink-0 text-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" className="h-4 w-4" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>

      <Modal open={guideOpen} onClose={() => setGuideOpen(false)} title="ホーム画面に追加">
        {isInApp && (
          <div className="mb-3 rounded-xl border-2 border-pend bg-pend-soft px-3 py-2.5 text-[12px] font-semibold text-pend">
            DiscordやXなどのアプリ内ブラウザからは、そのままではホーム画面に追加できません。まず既定のブラウザ
            {platform === "ios-inapp" ? "(Safariなど)" : "(Chromeなど)"}で開いてください。
          </div>
        )}
        <p className="mb-3 text-[12.5px] text-muted">
          ホーム画面に追加すると、アプリのように起動でき、プッシュ通知も受け取れます。
        </p>

        {platform === "ios-inapp" && (
          <ol className="space-y-4">
            <Step n={1} illust={<IllustOpenInBrowser />}>
              画面右上(または右下)の<b>「…」メニュー</b>から
              <b>「ブラウザで開く」(Safariで開く)</b>を選ぶ
            </Step>
            <Step n={2} illust={<IllustSafariShare />}>
              Safariで開いたら、画面下の<b>共有ボタン</b>をタップ
            </Step>
            <Step n={3} illust={<IllustAddToHome />}>
              メニューを下にスクロールして<b>「ホーム画面に追加」</b>をタップ
            </Step>
            <Step n={4}>
              右上の<b>「追加」</b>をタップして完了
            </Step>
          </ol>
        )}

        {platform === "ios-safari" && (
          <ol className="space-y-4">
            <Step n={1} illust={<IllustSafariShare />}>
              画面下(またはアドレスバー)の<b>共有ボタン</b>をタップ
            </Step>
            <Step n={2} illust={<IllustAddToHome />}>
              メニューを下にスクロールして<b>「ホーム画面に追加」</b>をタップ
            </Step>
            <Step n={3}>
              右上の<b>「追加」</b>をタップして完了
            </Step>
          </ol>
        )}

        {platform === "ios-browser" && (
          <ol className="space-y-4">
            <Step n={1} illust={<IllustChromeShare />}>
              アドレスバー横の<b>共有ボタン</b>をタップ(ChromeやEdgeでも追加できます)
            </Step>
            <Step n={2} illust={<IllustAddToHome />}>
              メニューから<b>「ホーム画面に追加」</b>をタップ
            </Step>
            <Step n={3}>
              <b>「追加」</b>をタップして完了
            </Step>
          </ol>
        )}

        {(platform === "android" || platform === "android-inapp") && (
          <ol className="space-y-4">
            {platform === "android-inapp" && (
              <Step n={1} illust={<IllustOpenInBrowser />}>
                画面右上の<b>「…」メニュー</b>から<b>「ブラウザで開く」</b>を選ぶ
              </Step>
            )}
            <Step n={platform === "android-inapp" ? 2 : 1} illust={<IllustAndroidMenu />}>
              Chromeの<b>「⋮」メニュー</b>から
              <b>「ホーム画面に追加」(アプリをインストール)</b>をタップ
            </Step>
            <Step n={platform === "android-inapp" ? 3 : 2}>
              <b>「追加」(インストール)</b>をタップして完了
            </Step>
          </ol>
        )}

        <p className="mt-4 rounded-lg bg-screen px-3 py-2 text-[11.5px] text-muted">
          {platform.startsWith("ios")
            ? "プッシュ通知は、ホーム画面に追加したアプリから開いた場合のみ有効になります(iOS 16.4以降)。"
            : "プッシュ通知は、追加したアプリから開いて設定画面でオンにできます。"}
        </p>
        <button
          onClick={() => {
            setGuideOpen(false);
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
