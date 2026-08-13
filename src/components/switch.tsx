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
      className={`relative inline-flex h-[26px] w-[46px] shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-ok" : "bg-line"
      } ${pending ? "opacity-60" : ""}`}
    >
      <span
        className={`inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[23px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}
