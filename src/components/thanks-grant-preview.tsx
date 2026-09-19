"use client";

import { THANKS_GRANT_PREVIEW_EVENT } from "./thanks-grant";

// ありがとう画面から 4:00 の付与演出を再生するボタン
export function ThanksGrantPreviewButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(THANKS_GRANT_PREVIEW_EVENT))}
      className="text-[11px] font-bold text-primary underline"
    >
      4:00 の演出を見る
    </button>
  );
}
