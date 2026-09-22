"use client";

import { useState } from "react";
import { rejectShare } from "@/lib/actions/expenses";
import { SubmitButton } from "./submit-button";

// 承認画面の「否認」。押すと理由(任意)の入力欄が開き、送信で否認する
export function RejectShareForm({ expenseId }: { expenseId: string }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-[10px] border-2 border-line bg-white px-3 py-2.5 text-[11.5px] font-bold text-muted"
      >
        否認
      </button>
    );
  }
  return (
    <form
      action={rejectShare.bind(null, expenseId)}
      className="mt-2 w-full rounded-[10px] border-2 border-dashed border-line bg-white p-2.5"
    >
      <label className="block text-[11.5px] font-bold text-muted" htmlFor={`reject-${expenseId}`}>
        否認の理由・メッセージ(任意)
      </label>
      <textarea
        id={`reject-${expenseId}`}
        name="reason"
        rows={2}
        maxLength={200}
        autoFocus
        placeholder="例: この日は参加していません / 金額が合っていないようです"
        className="mt-1 w-full rounded-[8px] border-2 border-line bg-white px-2.5 py-2 text-sm"
      />
      <p className="mt-1 text-[10.5px] text-muted">
        立替者・登録者・イベント主催者に届き、確定するか対象から外すかを判断してもらいます。
      </p>
      <div className="mt-2 flex gap-2">
        <SubmitButton className="flex-1 rounded-[10px] border-2 border-line bg-accent-soft px-3 py-2 text-[12px] font-bold text-accent">
          否認する
        </SubmitButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="shrink-0 rounded-[10px] border-2 border-line bg-white px-3 py-2 text-[12px] font-bold text-muted"
        >
          やめる
        </button>
      </div>
    </form>
  );
}
