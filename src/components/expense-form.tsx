"use client";

import { useRef, useState } from "react";
import { createExpense } from "@/lib/actions/expenses";
import { ReceiptInput } from "./receipt-input";
import { SplitPicker, type ExpenseEventOption, type SplitState } from "./split-picker";
import { SubmitButton } from "./submit-button";
import { useToast } from "./toast";
import { FormError } from "./form-error";
import { btnCls, inputCls, labelCls } from "./ui";

export type { ExpenseEventOption } from "./split-picker";

type Props = {
  members: { userId: string; name: string; excludedFromAll?: boolean }[];
  events: ExpenseEventOption[];
  selfId: string;
  onSuccess?: () => void;
};

export function ExpenseForm({ members, events, selfId, onSuccess }: Props) {
  const [split, setSplit] = useState<SplitState>({ mode: "all", count: 1 });
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false); // 二重送信防止(状態更新前の連打を弾く)
  const toast = useToast();

  return (
    <form
      action={async (formData) => {
        if (submitting.current) return;
        // 送信前のバリデーション(原因がわかるメッセージを表示)
        if (split.mode !== "all" && split.count === 0) {
          setError("負担するメンバーを1人以上選択してください");
          return;
        }
        submitting.current = true;
        setError(null);
        try {
          const res = await createExpense(formData);
          if (res?.error) {
            setError(res.error);
            submitting.current = false;
          } else {
            toast.show("費用を登録しました");
            onSuccess?.();
          }
        } catch {
          setError("登録に失敗しました。時間をおいて再度お試しください。");
          submitting.current = false;
        }
      }}
    >
      <label className={labelCls} htmlFor="title">内容</label>
      <input className={inputCls} id="title" name="title" required placeholder="BBQ食材" />

      <label className={labelCls} htmlFor="amount">金額(円)</label>
      <input
        className={inputCls}
        id="amount"
        name="amount"
        inputMode="numeric"
        required
        placeholder="18400"
      />

      <label className={labelCls} htmlFor="note">メモ(任意)</label>
      <textarea
        className="w-full rounded-[10px] border-2 border-line bg-white px-3 py-2.5 text-sm"
        id="note"
        name="note"
        rows={2}
        maxLength={500}
        placeholder="内訳や補足(例: 肉3kg・炭・紙皿。レシート2枚ぶん)"
      />

      <label className={labelCls} htmlFor="paidBy">立て替えた人</label>
      <select className={inputCls} id="paidBy" name="paidBy" defaultValue={selfId}>
        {members.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.name}
            {m.userId === selfId ? "(自分)" : ""}
          </option>
        ))}
      </select>

      <SplitPicker
        members={members}
        events={events}
        selfId={selfId}
        idPrefix="new-expense"
        onStateChange={setSplit}
      />

      <ReceiptInput idPrefix="new-expense" />

      <FormError message={error} />

      <SubmitButton className={`${btnCls} mt-4 w-full py-3.5`}>登録する</SubmitButton>
    </form>
  );
}
