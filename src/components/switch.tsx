"use client";

import { useFormStatus } from "react-dom";

// フォーム送信でトグルするスイッチ(iOS風)。onはchecked、pendingで薄く表示
export function SwitchButton({ checked }: { checked: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      role="switch"
      aria-checked={checked}
      disabled={pending}
      className={`relative inline-flex h-[26px] w-[46px] shrink-0 items-center rounded-full border-2 border-line transition-colors ${
        checked ? "bg-ok" : "bg-line-soft"
      } ${pending ? "opacity-60" : ""}`}
    >
      <span
        className={`inline-block h-[16px] w-[16px] transform rounded-full border-2 border-line bg-white transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}
