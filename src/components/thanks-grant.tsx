"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { THANKS_RESET_HOUR, thanksPeriodStart } from "@/lib/thanks";
import { IconHeart } from "./icons";

const SEEN_KEY = "thanks-grant-seen"; // 表示済みの期間開始時刻(ISO)
export const THANKS_GRANT_PREVIEW_EVENT = "thanks-grant:preview";
// 4:00 の切り替えと同じ経路(演出+再取得)を任意に起こすデモ用イベント
export const THANKS_GRANT_CROSS_EVENT = "thanks-grant:cross";
const AUTO_CLOSE_MS = 6000;
// キャラクター画像(public/thanks/character.png)。指差しポーズのイラストを置く。
// 見つからない場合はふきだしと +N pt だけを表示する
const CHARACTER_IMAGE = "/thanks/character.png";

// 毎朝4:00の手持ちリセット時に、キャラクターが「今日のありがとうポイントを付与するぜ!」と
// 告げてポイントが付与される演出。
// - アプリを開いたときにその日の期間で未表示なら1回表示(端末ごとに記憶)
// - 開いたまま4:00をまたいだときも表示し、画面を再読込して残ポイントを反映する
// - ありがとう画面の「演出を見る」からいつでも再生できる
export function ThanksGrant({ budget, endsAtMs }: { budget: number; endsAtMs: number }) {
  const [open, setOpen] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const router = useRouter();
  const periodRef = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (refresh: boolean) => {
      setOpen(true);
      if (refresh) router.refresh();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setOpen(false), AUTO_CLOSE_MS);
    },
    [router],
  );

  useEffect(() => {
    const closed = endsAtMs <= Date.now();
    const current = thanksPeriodStart().getTime();
    periodRef.current = current;
    // 初回: この期間でまだ見ていなければ表示(企画終了後は出さない)
    if (!closed) {
      try {
        const seen = localStorage.getItem(SEEN_KEY);
        if (seen !== String(current)) {
          localStorage.setItem(SEEN_KEY, String(current));
          const t = setTimeout(() => show(false), 700);
          return () => clearTimeout(t);
        }
      } catch {
        /* localStorage が使えない環境では毎回出さない(静かに無視) */
      }
    }
  }, [endsAtMs, show]);

  // 開いたまま4:00をまたいだとき
  useEffect(() => {
    const iv = setInterval(() => {
      if (endsAtMs <= Date.now()) return;
      const current = thanksPeriodStart().getTime();
      if (periodRef.current !== null && current !== periodRef.current) {
        periodRef.current = current;
        try {
          localStorage.setItem(SEEN_KEY, String(current));
        } catch {
          /* noop */
        }
        show(true);
      }
    }, 20_000);
    return () => clearInterval(iv);
  }, [endsAtMs, show]);

  // プレビュー(ありがとう画面のボタンから)/ 日付切り替えのデモ
  useEffect(() => {
    const onPreview = () => show(false);
    const onCross = () => show(true);
    window.addEventListener(THANKS_GRANT_PREVIEW_EVENT, onPreview);
    window.addEventListener(THANKS_GRANT_CROSS_EVENT, onCross);
    return () => {
      window.removeEventListener(THANKS_GRANT_PREVIEW_EVENT, onPreview);
      window.removeEventListener(THANKS_GRANT_CROSS_EVENT, onCross);
    };
  }, [show]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="今日のありがとうポイントを付与"
      className="thanks-grant fixed inset-0 z-[60] flex items-end justify-center overflow-hidden bg-ink/55 sm:items-center"
      onClick={() => setOpen(false)}
    >
      {/* 放射状の背景 */}
      <div className="thanks-grant-rays pointer-events-none absolute left-1/2 top-1/2 h-[160vmax] w-[160vmax] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40" />

      {/* ハートの紙吹雪 */}
      {Array.from({ length: 12 }, (_, i) => (
        <span
          key={i}
          className="thanks-grant-heart pointer-events-none absolute bottom-[30%] text-primary"
          style={{
            left: `${8 + i * 7.5}%`,
            animationDelay: `${1.2 + (i % 4) * 0.18}s`,
            fontSize: 14 + (i % 3) * 6,
          }}
        >
          <IconHeart className="h-[1em] w-[1em] fill-current" />
        </span>
      ))}

      <div className="relative mx-auto flex w-full max-w-md flex-col items-center px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:pb-0">
        {/* ふきだし */}
        <div className="thanks-grant-bubble relative mb-2 max-w-[92%] rounded-[18px] border-[3px] border-line bg-white px-4 py-3 text-center shadow-[4px_4px_0_var(--color-line)]">
          <p className="font-pop text-[17px] leading-snug">
            今日のありがとうポイントを
            <br />
            付与するぜ！
          </p>
          <span className="absolute -bottom-[14px] left-1/2 h-6 w-6 -translate-x-1/2 rotate-45 border-r-[3px] border-b-[3px] border-line bg-white" />
        </div>

        {/* +N pt の表示 */}
        <div className="thanks-grant-points pointer-events-none absolute top-[30%] right-[4%] rounded-full border-[3px] border-line bg-screen px-4 py-2 font-pop text-[26px] text-primary shadow-[4px_4px_0_var(--color-line)]">
          +{budget}
          <span className="ml-0.5 text-[13px]">pt</span>
        </div>

        {/* キャラクター(画像が無いときは高さだけ確保) */}
        <div className="thanks-grant-char relative h-[300px] w-[280px]">
          {imgOk && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={CHARACTER_IMAGE}
              alt=""
              onError={() => setImgOk(false)}
              className="thanks-grant-char-img h-full w-full object-contain drop-shadow-[0_8px_0_rgba(0,0,0,0.25)]"
            />
          )}
        </div>

        <p className="mt-1 text-[11.5px] font-bold text-white/85">
          毎朝 {THANKS_RESET_HOUR}:00 に {budget} pt 付与 · タップで閉じる
        </p>
      </div>
    </div>
  );
}
