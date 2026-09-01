"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`${className} animate-spin`}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

// フォーム送信中にスピナー表示+無効化するボタン。
// spinner=false の場合はスピナーを挿入せず、点滅(pulse)のみで表現する(複雑なレイアウトの子要素向け)。
export function SubmitButton({
  children,
  className = "",
  name,
  value,
  spinner = true,
  disabled = false,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  name?: string;
  value?: string;
  spinner?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const { pending, data } = useFormStatus();
  // name/value 付き(同一フォーム内に複数ボタン)の場合は、押されたボタンだけを
  // 送信中表示にする。押されていない方は disabled のみで静かに無効化する。
  const isSubmitter =
    pending && (!name || value === undefined || data?.get(name) === value);
  return (
    <button
      name={name}
      value={value}
      aria-label={ariaLabel}
      disabled={pending || disabled}
      className={`${className} ${
        isSubmitter ? "animate-pulse opacity-60" : pending ? "opacity-40" : ""
      }`}
    >
      {spinner && isSubmitter ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Spinner />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
