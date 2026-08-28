"use client";

import { useRef, useState } from "react";
import { createExpense } from "@/lib/actions/expenses";
import { fmtEventSpan } from "@/lib/format";
import { SubmitButton } from "./submit-button";
import { useToast } from "./toast";
import { FormError } from "./form-error";
import { btnCls, inputCls, labelCls } from "./ui";

export type ExpenseEventOption = {
  id: string;
  title: string;
  startMs: number;
  endMs: number;
  allDay: boolean;
  participantIds: string[]; // 参加登録済みメンバー
};

type Props = {
  members: { userId: string; name: string }[];
  events: ExpenseEventOption[];
  selfId: string;
  onSuccess?: () => void;
};

// 負担するメンバーの選び方: 全員で割り勘 / 個別に選択 / イベントの参加者
type PickMode = "all" | "members" | "event";

const MODE_LABELS: { key: PickMode; label: string }[] = [
  { key: "all", label: "全員で割り勘" },
  { key: "members", label: "個別に選択" },
  { key: "event", label: "イベント参加者" },
];

export function ExpenseForm({ members, events, selfId, onSuccess }: Props) {
  const [mode, setMode] = useState<PickMode>("all");
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false); // 二重送信防止(状態更新前の連打を弾く)
  const toast = useToast();

  const [eventId, setEventId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set([selfId]));

  const currentEvent = events.find((e) => e.id === eventId);
  const participantIds = new Set(currentEvent?.participantIds ?? []);

  const applyEventMembers = (evId: string) => {
    const ev = events.find((e) => e.id === evId);
    if (ev) {
      setSelected(new Set(ev.participantIds.length ? ev.participantIds : [selfId]));
    }
  };
  const toggleMember = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <form
      action={async (formData) => {
        if (submitting.current) return;
        // 送信前のバリデーション(原因がわかるメッセージを表示)
        if (mode !== "all" && selected.size === 0) {
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

      <label className={labelCls} htmlFor="paidBy">立て替えた人</label>
      <select className={inputCls} id="paidBy" name="paidBy" defaultValue={selfId}>
        {members.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.name}
            {m.userId === selfId ? "(自分)" : ""}
          </option>
        ))}
      </select>

      <label className={labelCls}>負担するメンバーの選び方</label>
      <div className="grid grid-cols-3 gap-1 rounded-[10px] border-2 border-line bg-white p-1">
        {MODE_LABELS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => {
              setMode(m.key);
              if (m.key === "event" && eventId) applyEventMembers(eventId);
            }}
            className={`rounded-lg px-0.5 py-2 text-center text-[11px] font-bold whitespace-nowrap ${
              mode === m.key ? "bg-ink text-screen" : "text-muted"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="mx-0.5 mt-1.5 text-[11px] text-muted">
        {mode === "all" &&
          "参加者全員に均等割り。各メンバーの承認なしでそのまま計上されます。"}
        {mode === "members" &&
          "選んだメンバーで均等割り。各メンバーの承認後に確定します(立替者本人は承認不要)。"}
        {mode === "event" &&
          "イベントを選ぶと参加者が自動で選択されます。各メンバーの承認後に確定します。"}
      </p>
      {/* 全員で割り勘はサーバー側の既存フラグで送る */}
      {mode === "all" && <input type="hidden" name="splitAll" value="on" />}

      {mode === "event" && (
        <>
          <label className={labelCls} htmlFor="eventId">関連イベント</label>
          <select
            className={inputCls}
            id="eventId"
            name="eventId"
            required
            value={eventId}
            onChange={(e) => {
              setEventId(e.target.value);
              applyEventMembers(e.target.value);
            }}
          >
            <option value="">選択してください</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} · {fmtEventSpan(new Date(e.startMs), new Date(e.endMs), e.allDay)}
              </option>
            ))}
          </select>
          <p className="mx-0.5 mt-1.5 text-[11px] text-muted">
            未承認のまま24時間経過するとイベント主催者と管理者に通知され、承認状況を操作できます。
          </p>
        </>
      )}

      {mode !== "all" && (
        <>
          <label className={labelCls}>負担するメンバー</label>
          <div className="flex flex-wrap gap-1.5">
            {members.map((m) => {
              const checked = selected.has(m.userId);
              // イベント参加者モードでは、不参加メンバーを非アクティブ(減光)で
              // 表示しつつタップで追加選択できるようにする
              const inactive =
                mode === "event" &&
                !!eventId &&
                !participantIds.has(m.userId) &&
                !checked;
              return (
                <label
                  key={m.userId}
                  className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-[12.5px] font-bold ${
                    checked
                      ? "border-line bg-primary text-white"
                      : inactive
                        ? "border-dashed border-line bg-white text-muted opacity-45"
                        : "border-line bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="memberIds"
                    value={m.userId}
                    checked={checked}
                    onChange={() => toggleMember(m.userId)}
                    className="sr-only"
                  />
                  {m.name}
                </label>
              );
            })}
          </div>
          {mode === "members" && (
            <p className="mx-0.5 mt-1.5 text-[11px] text-muted">
              未承認のまま24時間経過すると管理者に通知され、承認状況を操作できます。
            </p>
          )}
        </>
      )}

      <FormError message={error} />

      <SubmitButton className={`${btnCls} mt-4 w-full py-3.5`}>登録する</SubmitButton>
    </form>
  );
}
