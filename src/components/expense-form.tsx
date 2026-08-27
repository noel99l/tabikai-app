"use client";

import { useRef, useState } from "react";
import { createExpense } from "@/lib/actions/expenses";
import { fmtEventSpan } from "@/lib/format";
import { Spinner } from "./submit-button";
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

export function ExpenseForm({ members, events, selfId, onSuccess }: Props) {
  const [splitAll, setSplitAll] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false); // 二重送信防止(状態更新前の連打を弾く)

  // 負担メンバーの選び方: 個別に選択(デフォルト) / イベントの参加者から自動選択
  const [pickMode, setPickMode] = useState<"members" | "event">("members");
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
        submitting.current = true;
        setPending(true);
        setError(null);
        try {
          const res = await createExpense(formData);
          if (res?.error) {
            setError(res.error);
            setPending(false);
            submitting.current = false;
          } else {
            setPending(false);
            onSuccess?.();
          }
        } catch {
          setError("登録に失敗しました。時間をおいて再度お試しください。");
          setPending(false);
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
          <select
            className={inputCls}
            id="eventId"
            name="eventId"
            required
            value={eventId}
            onChange={(e) => {
              setEventId(e.target.value);
              if (pickMode === "event") applyEventMembers(e.target.value);
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

          <label className={labelCls}>負担するメンバーの選び方</label>
          <div className="grid grid-cols-2 gap-1 rounded-[10px] border-2 border-line bg-white p-1">
            <button
              type="button"
              onClick={() => setPickMode("members")}
              className={`rounded-lg py-2 text-center text-[12.5px] font-bold ${
                pickMode === "members" ? "bg-ink text-screen" : "text-muted"
              }`}
            >
              個別に選択
            </button>
            <button
              type="button"
              onClick={() => {
                setPickMode("event");
                if (eventId) applyEventMembers(eventId);
              }}
              className={`rounded-lg py-2 text-center text-[12.5px] font-bold ${
                pickMode === "event" ? "bg-ink text-screen" : "text-muted"
              }`}
            >
              イベントの参加者
            </button>
          </div>
          {pickMode === "event" && (
            <p className="mx-0.5 mt-1.5 text-[11px] text-muted">
              {eventId
                ? "参加者を自動選択しました。薄い表示の不参加メンバーもタップで追加できます。"
                : "関連イベントを選ぶと、その参加者が自動で選択されます。"}
            </p>
          )}

          <label className={labelCls}>負担するメンバー</label>
          <div className="flex flex-wrap gap-1.5">
            {members.map((m) => {
              const checked = selected.has(m.userId);
              // イベント参加者モードでは、不参加メンバーを非アクティブ(減光)で
              // 表示しつつタップで追加選択できるようにする
              const inactive =
                pickMode === "event" &&
                !!eventId &&
                !participantIds.has(m.userId) &&
                !checked;
              return (
                <label
                  key={m.userId}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] ${
                    checked
                      ? "border-primary bg-primary text-white"
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
