"use client";

import { useEffect, useRef } from "react";

// フォームのバリデーションエラー表示。表示されたら自動でスクロールして見せる。
export function FormError({ message }: { message: string | null }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (message) {
      ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [message]);
  if (!message) return null;
  return (
    <p
      ref={ref}
      role="alert"
      className="mt-3 rounded-lg border-2 border-accent bg-accent-soft px-3 py-2 text-[12.5px] font-bold text-accent"
    >
      {message}
    </p>
  );
}
