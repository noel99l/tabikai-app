"use client";

import { useRef, useState } from "react";
import { deleteExpense, updateExpense } from "@/lib/actions/expenses";
import { yen } from "@/lib/format";
import { Modal } from "./modal";
import { Pill, btnCls, inputCls, labelCls } from "./ui";
import { SubmitButton } from "./submit-button";

type ShareInfo = { userId: string; name: string; amount: number; status: string };

type Props = {
  expense: {
    id: string;
    title: string;
    amount: number;
    paidBy: string;
    splitAll: boolean;
    eventTitle: string | null;
  };
  shares: ShareInfo[];
  members: { userId: string; name: string }[];
  canEdit: boolean;
};

const statusLabel: Record<string, { label: string; tone: "ok" | "pend" | "info" }> = {
  approved: { label: "承認済み", tone: "ok" },
  forced: { label: "確定(管理)", tone: "ok" },
  pending: { label: "承認待ち", tone: "pend" },
  excluded: { label: "対象外", tone: "info" },
  rejected: { label: "否認", tone: "pend" },
};

export function ExpenseRow({ expense, shares, members, canEdit }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);

  const active = shares.filter((s) => s.status !== "excluded");
  const done = active.filter((s) => s.status === "approved" || s.status === "forced");
  const confirmed = expense.splitAll || done.length === active.length;
  const nameOf = (id: string) => members.find((m) => m.userId === id)?.name ?? "";

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setEditing(false);
          setError(null);
        }}
        className="mb-2.5 flex w-full items-center justify-between gap-2.5 rounded-[14px] border-2 border-line bg-white p-3.5 text-left shadow-[3px_3px_0_var(--color-line)]"
      >
        <div className="min-w-0">
          <div className="text-sm font-bold">
            {expense.title}{" "}
            {expense.splitAll && <Pill tone="violet">全員</Pill>}{" "}
            {confirmed ? (
              <Pill tone="ok">確定</Pill>
            ) : (
              <Pill tone="pend">承認 {done.length}/{active.length}</Pill>
            )}
          </div>
          <div className="text-[11.5px] text-muted">
            立替: {nameOf(expense.paidBy)} · 対象{active.length}人
            {expense.eventTitle ? ` · ${expense.eventTitle}` : ""}
          </div>
        </div>
        <div className="shrink-0 text-base font-extrabold tabular-nums">
          {yen(expense.amount)}
        </div>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={expense.title}>
        {!editing ? (
          <>
            <div className="rounded-[14px] border-2 border-line bg-white p-3.5 shadow-[3px_3px_0_var(--color-line)]">
              <div className="flex justify-between border-b border-line py-2 text-[13px]">
                <span className="text-muted">金額</span>
                <span className="font-bold tabular-nums">{yen(expense.amount)}</span>
              </div>
              <div className="flex justify-between border-b border-line py-2 text-[13px]">
                <span className="text-muted">立替</span>
                <span className="font-semibold">{nameOf(expense.paidBy)}</span>
              </div>
              <div className="flex justify-between border-b border-line py-2 text-[13px]">
                <span className="text-muted">割り勘</span>
                <span className="font-semibold">
                  {expense.splitAll ? "全員(承認不要)" : "個別指定"}
                </span>
              </div>
              {expense.eventTitle && (
                <div className="flex justify-between py-2 text-[13px]">
                  <span className="text-muted">関連イベント</span>
                  <span className="font-semibold">{expense.eventTitle}</span>
                </div>
              )}
            </div>

            <h3 className="mx-0.5 mt-4 mb-2 text-[13px] font-bold text-muted">
              内訳({active.length}人)
            </h3>
            {shares.map((s) => (
              <div
                key={s.userId}
                className="mb-1.5 flex items-center justify-between rounded-lg border-2 border-line bg-white px-3 py-2"
              >
                <span className="text-[13px] font-semibold">{s.name}</span>
                <span className="flex items-center gap-2">
                  <span className="text-[13px] tabular-nums">{yen(s.amount)}</span>
                  <Pill tone={statusLabel[s.status]?.tone ?? "info"}>
                    {statusLabel[s.status]?.label ?? s.status}
                  </Pill>
                </span>
              </div>
            ))}

            {canEdit && (
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setEditing(true)}
                  className={`${btnCls} flex-1`}
                >
                  編集する
                </button>
                <form
                  action={deleteExpense.bind(null, expense.id)}
                  className="flex-1"
                  onSubmit={() => setOpen(false)}
                >
                  <SubmitButton
                    spinner={false}
                    className="w-full rounded-lg bg-accent-soft px-4 py-2.5 text-[13px] font-bold text-accent"
                  >
                    削除
                  </SubmitButton>
                </form>
              </div>
            )}
          </>
        ) : (
          <form
            action={async (formData) => {
              if (submitting.current) return;
              submitting.current = true;
              setError(null);
              try {
                const res = await updateExpense(formData);
                if (res?.error) {
                  setError(res.error);
                  submitting.current = false;
                } else {
                  setOpen(false);
                }
              } catch {
                setError("更新に失敗しました。");
                submitting.current = false;
              }
            }}
          >
            <input type="hidden" name="expenseId" value={expense.id} />
            <label className={labelCls} htmlFor={`edit-title-${expense.id}`}>内容</label>
            <input
              className={inputCls}
              id={`edit-title-${expense.id}`}
              name="title"
              defaultValue={expense.title}
              required
            />
            <label className={labelCls} htmlFor={`edit-amount-${expense.id}`}>金額(円)</label>
            <input
              className={inputCls}
              id={`edit-amount-${expense.id}`}
              name="amount"
              inputMode="numeric"
              defaultValue={expense.amount}
              required
            />
            <label className={labelCls} htmlFor={`edit-paid-${expense.id}`}>立て替えた人</label>
            <select
              className={inputCls}
              id={`edit-paid-${expense.id}`}
              name="paidBy"
              defaultValue={expense.paidBy}
            >
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>{m.name}</option>
              ))}
            </select>
            <p className="mx-0.5 mt-2 text-[11px] text-muted">
              金額を変更すると割り勘額が再計算され、個別割り勘は対象者の再承認が必要になります。
            </p>
            {error && (
              <p className="mt-2 rounded-lg bg-accent-soft px-3 py-2 text-[12.5px] font-bold text-accent">
                {error}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex-1 rounded-lg border-2 border-line bg-line-soft px-4 py-2.5 text-[13px] font-bold text-ink"
              >
                戻る
              </button>
              <SubmitButton className={`${btnCls} flex-1`}>保存する</SubmitButton>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
