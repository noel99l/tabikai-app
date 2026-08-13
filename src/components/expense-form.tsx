"use client";

import { useState } from "react";
import { createExpense } from "@/lib/actions/expenses";
import { Spinner } from "./submit-button";
import { btnCls, inputCls, labelCls } from "./ui";

type Props = {
  members: { userId: string; name: string }[];
  events: { id: string; title: string }[];
  selfId: string;
};

export function ExpenseForm({ members, events, selfId }: Props) {
  const [splitAll, setSplitAll] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={async (formData) => {
        setPending(true);
        setError(null);
        try {
          const res = await createExpense(formData);
          if (res?.error) {
            setError(res.error);
            setPending(false);
          }
        } catch (e) {
          const digest =
            e && typeof e === "object" && "digest" in e ? String(e.digest) : "";
          if (digest.startsWith("NEXT_REDIRECT")) throw e;
          setError("登録に失敗しました。時間をおいて再度お試しください。");
          setPending(false);
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

      <label className={labelCls} htmlFor="paidBy">立て替えた人</label>
      <select className={inputCls} id="paidBy" name="paidBy" defaultValue={selfId}>
        {members.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.name}
            {m.userId === selfId ? "(自分)" : ""}
          </option>
        ))}
      </select>

      <label className="mt-4 flex items-start gap-2.5 rounded-[10px] bg-primary-soft p-3">
        <input
          type="checkbox"
          name="splitAll"
          checked={splitAll}
          onChange={(e) => setSplitAll(e.target.checked)}
          className="mt-0.5 h-5 w-5 accent-primary"
        />
        <span>
          <span className="block text-[13px] font-bold">全員で割り勘にする</span>
          <span className="block text-[11.5px] text-primary">
            参加者全員に均等割り。各メンバーの承認なしでそのまま計上されます。
          </span>
        </span>
      </label>

      {!splitAll && (
        <>
          <label className={labelCls} htmlFor="eventId">関連イベント(個別割り勘では必須)</label>
          <select className={inputCls} id="eventId" name="eventId" required>
            <option value="">選択してください</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
          <p className="mx-0.5 mt-1.5 text-[11px] text-muted">
            未承認のまま24時間経過するとイベント主催者と管理者に通知され、承認状況を操作できます。
          </p>

          <label className={labelCls}>負担するメンバー</label>
          <div className="flex flex-wrap gap-1.5">
            {members.map((m) => (
              <label
                key={m.userId}
                className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-[12.5px] has-checked:border-primary has-checked:bg-primary has-checked:text-white"
              >
                <input
                  type="checkbox"
                  name="memberIds"
                  value={m.userId}
                  defaultChecked={m.userId === selfId}
                  className="sr-only"
                />
                {m.name}
              </label>
            ))}
          </div>
          <p className="mx-0.5 mt-1.5 text-[11px] text-muted">
            個別指定の費用は、各メンバーの承認後に確定します(立替者本人は承認不要)。
          </p>
        </>
      )}

      {error && (
        <p className="mt-2 rounded-lg bg-accent-soft px-3 py-2 text-[12.5px] font-bold text-accent">
          {error}
        </p>
      )}

      <button
        className={`${btnCls} mt-4 flex w-full items-center justify-center gap-2 py-3.5`}
        disabled={pending}
      >
        {pending && <Spinner />}
        {pending ? "登録中…" : "登録する"}
      </button>
    </form>
  );
}
