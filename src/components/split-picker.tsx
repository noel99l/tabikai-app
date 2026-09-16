"use client";

import { useState } from "react";
import { fmtEventSpan } from "@/lib/format";
import { inputCls, labelCls } from "./ui";

export type ExpenseEventOption = {
  id: string;
  title: string;
  startMs: number;
  endMs: number;
  allDay: boolean;
  participantIds: string[]; // 参加登録済みメンバー
};

// 負担するメンバーの選び方: 全員で割り勘 / 個別に選択 / イベントの参加者
export type PickMode = "all" | "members" | "event";

const MODE_LABELS: { key: PickMode; label: string }[] = [
  { key: "all", label: "全員で割り勘" },
  { key: "members", label: "個別に選択" },
  { key: "event", label: "イベント参加者" },
];

export type SplitState = { mode: PickMode; count: number };

// 費用の割り勘対象を選ぶ共通UI(登録・編集で共用)。
// フォームには splitMode / splitAll / eventId / memberIds を hidden・チェックボックスで載せる
export function SplitPicker({
  members,
  events,
  selfId,
  idPrefix,
  initial,
  onStateChange,
}: {
  members: { userId: string; name: string }[];
  events: ExpenseEventOption[];
  selfId: string;
  idPrefix: string;
  initial?: { mode: PickMode; selected: string[]; eventId: string | null };
  onStateChange?: (s: SplitState) => void;
}) {
  const [mode, setModeRaw] = useState<PickMode>(initial?.mode ?? "all");
  const [eventId, setEventId] = useState(initial?.eventId ?? "");
  const [selected, setSelectedRaw] = useState<Set<string>>(
    () => new Set(initial?.selected?.length ? initial.selected : [selfId]),
  );

  const emit = (m: PickMode, s: Set<string>) => onStateChange?.({ mode: m, count: s.size });
  const setMode = (m: PickMode) => {
    setModeRaw(m);
    emit(m, selected);
  };
  const setSelected = (s: Set<string>) => {
    setSelectedRaw(s);
    emit(mode, s);
  };

  const currentEvent = events.find((e) => e.id === eventId);
  const participantIds = new Set(currentEvent?.participantIds ?? []);

  const applyEventMembers = (evId: string) => {
    const ev = events.find((e) => e.id === evId);
    if (ev) setSelected(new Set(ev.participantIds.length ? ev.participantIds : [selfId]));
  };
  const toggleMember = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <>
      <label className={labelCls}>負担するメンバーの選び方</label>
      {/* サーバーが「選び方の指定あり」を判別するためのマーカー */}
      <input type="hidden" name="splitMode" value={mode} />
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
          <label className={labelCls} htmlFor={`${idPrefix}-eventId`}>関連イベント</label>
          <select
            className={inputCls}
            id={`${idPrefix}-eventId`}
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
                mode === "event" && !!eventId && !participantIds.has(m.userId) && !checked;
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
    </>
  );
}
