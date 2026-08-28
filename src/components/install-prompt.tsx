"use client";

import Image from "next/image";
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
// android: beforeinstallprompt が発火した環境(ワンタップ追加)
// android-manual: 発火前・シークレットモード等(メニューから手動で追加)
// android-inapp: アプリ内ブラウザ
type Platform =
  | "none"
  | "ios-safari"
  | "ios-browser"
  | "ios-inapp"
  | "android"
  | "android-manual"
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


// 実機スクリーンショット(public/guide/ 以下、赤枠でタップ箇所を強調済み)
function GuideShot({ src, alt, height }: { src: string; alt: string; height: number }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={720}
      height={height}
      className="w-full rounded-xl border-2 border-line"
    />
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

// mode: "banner" はホーム上部の告知(×で以後非表示) /
// "card" はアカウント画面の常設カード(×なし・いつでも手順を見られる)
export function InstallPrompt({ mode = "banner" }: { mode?: "banner" | "card" }) {
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
    if (mode === "banner" && localStorage.getItem(DISMISS_KEY) === "1") return;

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
    // シークレットモード等では beforeinstallprompt が発火しないため、
    // Androidではまず手動手順の案内を出し、発火したらワンタップ追加に切り替える
    if (/android/i.test(ua)) setPlatform("android-manual");
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setPlatform("android");
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, [mode]);

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
      <div
        className={`flex items-center gap-3 rounded-[14px] border-2 border-line bg-white shadow-[3px_3px_0_var(--color-line)] ${
          mode === "card" ? "mt-2.5 p-3.5" : "mb-2.5 p-3"
        }`}
      >
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
        {mode === "banner" && (
          <button onClick={dismiss} aria-label="閉じる" className="shrink-0 text-muted">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" className="h-4 w-4" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        )}
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
            <Step n={2} illust={<GuideShot src="/guide/safari-step2-share.png" alt="メニューの共有" height={489} />}>
              ブラウザで開いたら、アドレスバー横の<b>「…」メニュー</b>から<b>「共有」</b>をタップ
            </Step>
            <Step n={3} illust={<GuideShot src="/guide/safari-step3-a2hs.png" alt="共有メニューのホーム画面に追加" height={577} />}>
              <b>「ホーム画面に追加」</b>をタップ
            </Step>
            <Step n={4} illust={<GuideShot src="/guide/safari-step4-add.png" alt="右上の追加をタップ" height={476} />}>
              右上の<b>「追加」</b>をタップして完了
            </Step>
          </ol>
        )}

        {platform === "ios-safari" && (
          <>
            <ol className="space-y-4">
              <Step n={1} illust={<GuideShot src="/guide/safari-step1-menu.png" alt="アドレスバー横のメニューボタン" height={234} />}>
                アドレスバー横の<b>「…」メニュー</b>をタップ
              </Step>
              <Step n={2} illust={<GuideShot src="/guide/safari-step2-share.png" alt="メニューの共有" height={489} />}>
                <b>「共有」</b>をタップ
              </Step>
              <Step n={3} illust={<GuideShot src="/guide/safari-step3-a2hs.png" alt="共有メニューのホーム画面に追加" height={577} />}>
                <b>「ホーム画面に追加」</b>をタップ
              </Step>
              <Step n={4} illust={<GuideShot src="/guide/safari-step4-add.png" alt="右上の追加をタップ" height={476} />}>
                右上の<b>「追加」</b>をタップして完了
              </Step>
            </ol>
            <p className="mt-3 text-[11.5px] text-muted">
              古いバージョンのiOSでは、画面下中央の共有ボタン(四角に上矢印)から共有メニューを開けます。
            </p>
          </>
        )}

        {platform === "ios-browser" && (
          <ol className="space-y-4">
            <Step n={1} illust={<GuideShot src="/guide/chrome-step1-share.png" alt="アドレスバー右の共有ボタン" height={140} />}>
              アドレスバー右の<b>共有ボタン</b>をタップ
            </Step>
            <Step n={2} illust={<GuideShot src="/guide/chrome-step2-more.png" alt="共有メニューのもっと見る" height={333} />}>
              共有メニューの<b>「もっと見る」</b>をタップ
            </Step>
            <Step n={3} illust={<GuideShot src="/guide/chrome-step3-a2hs.png" alt="ホーム画面に追加" height={406} />}>
              <b>「ホーム画面に追加」</b>をタップ
            </Step>
            <Step n={4} illust={<GuideShot src="/guide/chrome-step4-add.png" alt="右上の追加をタップ" height={476} />}>
              右上の<b>「追加」</b>をタップして完了
            </Step>
          </ol>
        )}

        {(platform === "android" ||
          platform === "android-manual" ||
          platform === "android-inapp") && (
          <>
            {platform === "android-manual" && (
              <div className="mb-3 rounded-xl border-2 border-pend bg-pend-soft px-3 py-2.5 text-[12px] font-semibold text-pend">
                シークレットモード(シークレットタブ)ではホーム画面に追加できません。通常のタブで開いてから操作してください。
              </div>
            )}
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
          </>
        )}

        <p className="mt-4 rounded-lg bg-screen px-3 py-2 text-[11.5px] text-muted">
          {platform.startsWith("ios")
            ? "プッシュ通知は、ホーム画面に追加したアプリから開いた場合のみ有効になります(iOS 16.4以降)。"
            : "プッシュ通知は、追加したアプリから開いて設定画面でオンにできます。"}
        </p>
        <button
          onClick={() => {
            setGuideOpen(false);
            if (mode === "banner") dismiss();
          }}
          className="mt-4 w-full rounded-lg bg-primary px-4 py-3 text-[13px] font-bold text-white"
        >
          追加しました / あとで
        </button>
      </Modal>
    </>
  );
}
