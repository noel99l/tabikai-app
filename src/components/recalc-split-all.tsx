"use client";

import { useTransition } from "react";
import { recalcSplitAllExpenses } from "@/lib/actions/trips";
import { Spinner } from "./submit-button";
import { useToast } from "./toast";

// 登録済みの全員割り勘を今の対象外設定で割り直す(管理者・メンバー管理から)
export function RecalcSplitAllButton() {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          !window.confirm(
            "登録済みの「全員で割り勘」の費用を、今の対象外設定に合わせて割り直します。よろしいですか?",
          )
        )
          return;
        startTransition(async () => {
          const res = await recalcSplitAllExpenses();
          toast.show(
            res.changed > 0
              ? `全員割り勘 ${res.changed} 件を割り直しました`
              : "割り直しが必要な費用はありませんでした",
          );
        });
      }}
      className="mb-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-[10px] border-2 border-dashed border-line bg-white py-2 text-[12px] font-bold text-muted disabled:opacity-60"
    >
      {pending && <Spinner className="h-3 w-3" />}
      登録済みの全員割り勘を今の設定で再計算する
    </button>
  );
}
