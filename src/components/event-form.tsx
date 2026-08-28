"use client";

import { useRef, useState } from "react";
import { createEvent } from "@/lib/actions/events";
import {
  EVENT_COLORS,
  EVENT_ICON_KEYS,
  EVENT_ICON_LABELS,
  EventIcon,
  eventSwatchClass,
} from "./event-icons";
import { SubmitButton } from "./submit-button";
import { useToast } from "./toast";
import { btnCls, inputCls, labelCls } from "./ui";

type Props = {
  venues: { id: string; name: string }[];
  days: { key: string; label: string }[];
  members: { userId: string; name: string }[];
  selfId: string;
  // 予定表の範囲選択からのプリセット
  defaults?: { venueId?: string; date?: string; start?: string; end?: string };
  // 作成成功時(モーダルを閉じる等)
  onSuccess?: () => void;
};

export function EventForm({ venues, days, members, selfId, defaults, onSuccess }: Props) {
  // 招待: デフォルトは「個別に招待」
  const [inviteMode, setInviteMode] = useState<"members" | "all">("members");
  const [invitees, setInvitees] = useState<Set<string>>(() => new Set());
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState("red");
  const [icon, setIcon] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const toast = useToast();

  const toggleInvitee = (id: string) => {
    setInvitees((prev) => {
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
        setError(null);
        try {
          const res = await createEvent(formData);
          if (res?.error) {
            setError(res.error);
            submitting.current = false;
          } else {
            toast.show("イベントを作成しました");
            onSuccess?.();
          }
        } catch {
          setError("作成に失敗しました。時間をおいて再度お試しください。");
          submitting.current = false;
        }
      }}
    >
      <label className={labelCls} htmlFor="title">イベント名</label>
      <input className={inputCls} id="title" name="title" required placeholder="花火大会" />

      <label className={labelCls} htmlFor="venueId">会場</label>
      <select className={inputCls} id="venueId" name="venueId" required defaultValue={defaults?.venueId}>
        {venues.map((v) => (
          <option key={v.id} value={v.id}>{v.name}</option>
        ))}
      </select>

      <label className="mt-3 flex items-center gap-2.5 text-[13px] font-semibold">
        <input
          type="checkbox"
          name="allDay"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
          className="h-5 w-5 accent-primary"
        />
        終日(期間で会場を確保)
      </label>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls} htmlFor="date">開始日</label>
          <select className={inputCls} id="date" name="date" required defaultValue={defaults?.date}>
            {days.map((d) => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </select>
        </div>
        {!allDay && (
          <div>
            <label className={labelCls} htmlFor="start">開始時刻</label>
            <input className={inputCls} id="start" name="start" type="time" required defaultValue={defaults?.start ?? "19:30"} />
          </div>
        )}
        <div>
          <label className={labelCls} htmlFor="endDate">終了日</label>
          <select className={inputCls} id="endDate" name="endDate" required defaultValue={defaults?.date}>
            {days.map((d) => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </select>
        </div>
        {!allDay && (
          <div>
            <label className={labelCls} htmlFor="end">終了時刻</label>
            <input className={inputCls} id="end" name="end" type="time" required defaultValue={defaults?.end ?? "20:30"} />
          </div>
        )}
      </div>
      <p className="mx-0.5 mt-1 text-[11px] text-muted">
        {allDay
          ? "開始日〜終了日の期間、この会場を終日押さえます。"
          : "終了日を翌日以降にすると、日をまたぐ予定を作成できます。"}
      </p>

      <label className={labelCls} htmlFor="description">説明(任意)</label>
      <input className={inputCls} id="description" name="description" placeholder="持ち物や集合場所など" />

      {/* 予定表での見た目: カラー+アイコン */}
      <label className={labelCls}>カレンダーのカラー</label>
      <input type="hidden" name="color" value={color} />
      <div className="flex gap-2.5">
        {EVENT_COLORS.map((c) => (
          <button
            key={c.key}
            type="button"
            aria-label={c.label}
            onClick={() => setColor(c.key)}
            className={`h-9 w-9 rounded-full border-2 border-line ${eventSwatchClass(c.key)} ${
              color === c.key
                ? "shadow-[2px_2px_0_var(--color-line)] ring-2 ring-ink ring-offset-2 ring-offset-screen"
                : "opacity-70"
            }`}
          />
        ))}
      </div>

      <label className={labelCls}>カレンダーのアイコン(任意)</label>
      <input type="hidden" name="icon" value={icon ?? ""} />
      <div className="grid grid-cols-6 gap-1.5">
        <button
          type="button"
          onClick={() => setIcon(null)}
          className={`flex aspect-square items-center justify-center rounded-lg border-2 text-[10px] font-bold ${
            icon === null ? "border-line bg-ink text-screen" : "border-line bg-white text-muted"
          }`}
        >
          なし
        </button>
        {EVENT_ICON_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            aria-label={EVENT_ICON_LABELS[k] ?? k}
            onClick={() => setIcon(k)}
            className={`flex aspect-square items-center justify-center rounded-lg border-2 ${
              icon === k ? "border-line bg-ink text-screen" : "border-line bg-white text-ink"
            }`}
          >
            <EventIcon icon={k} className="h-5 w-5" />
          </button>
        ))}
      </div>

      {/* 招待(費用の「選び方」と同じセグメントUI。デフォルトは個別に招待) */}
      <label className={labelCls}>招待するメンバー</label>
      <div className="grid grid-cols-2 gap-1 rounded-[10px] border-2 border-line bg-white p-1">
        <button
          type="button"
          onClick={() => setInviteMode("members")}
          className={`rounded-lg py-2 text-center text-[12.5px] font-bold ${
            inviteMode === "members" ? "bg-ink text-screen" : "text-muted"
          }`}
        >
          個別に招待
        </button>
        <button
          type="button"
          onClick={() => setInviteMode("all")}
          className={`rounded-lg py-2 text-center text-[12.5px] font-bold ${
            inviteMode === "all" ? "bg-ink text-screen" : "text-muted"
          }`}
        >
          全員を招待
        </button>
      </div>
      <p className="mx-0.5 mt-1.5 text-[11px] text-muted">
        {inviteMode === "all"
          ? "承認済みメンバー全員に招待のお知らせ+通知が届きます。"
          : "選んだメンバーにだけ招待が届きます(あとから参加者の追加もできます)。"}
      </p>
      {inviteMode === "all" && <input type="hidden" name="inviteAll" value="on" />}

      {inviteMode === "members" && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {members
            .filter((m) => m.userId !== selfId)
            .map((m) => {
              const checked = invitees.has(m.userId);
              return (
                <label
                  key={m.userId}
                  className={`flex items-center gap-1.5 rounded-full border-2 border-line px-3 py-1.5 text-[12.5px] font-bold ${
                    checked ? "bg-primary text-white" : "bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="memberIds"
                    value={m.userId}
                    checked={checked}
                    onChange={() => toggleInvitee(m.userId)}
                    className="sr-only"
                  />
                  {m.name}
                </label>
              );
            })}
        </div>
      )}

      <p className="mx-0.5 mt-3.5 text-[11.5px] text-muted">
        同じ会場・時間帯に複数のイベントを重ねて登録できます。
        参加者には開始前に自動でリマインド通知が届きます(各自オフ可)。
      </p>

      {error && (
        <p className="mt-2 rounded-lg bg-accent-soft px-3 py-2 text-[12.5px] font-bold text-accent">
          {error}
        </p>
      )}

      <SubmitButton className={`${btnCls} mt-3 w-full py-3.5`}>
        会場を予約してイベントを作成
      </SubmitButton>
    </form>
  );
}
