"use client";

import { useRef, useState } from "react";
import { updateEvent } from "@/lib/actions/events";
import {
  EVENT_COLORS,
  EVENT_ICON_KEYS,
  EVENT_ICON_LABELS,
  EventIcon,
  eventSwatchClass,
} from "./event-icons";
import { Modal } from "./modal";
import { SubmitButton } from "./submit-button";
import { useToast } from "./toast";
import { FormError } from "./form-error";
import { EventDelete } from "./event-delete";
import { btnCls, btnGhostCls, inputCls, labelCls } from "./ui";

type Props = {
  eventId: string;
  venues: { id: string; name: string }[];
  days: { key: string; label: string }[];
  members: { userId: string; name: string }[];
  participantIds: string[]; // 現在の参加者(招待中含む)
  hostId: string; // 主催者は外せない
  defaults: {
    title: string;
    description: string;
    venueId: string;
    date: string;
    endDate: string;
    start: string;
    end: string;
    allDay: boolean;
    color: string | null;
    icon: string | null;
  };
};

// イベント詳細からの編集(主催者・管理者のみ)。モーダルで同ページ内完結。
export function EventEdit({ eventId, venues, days, members, participantIds, hostId, defaults }: Props) {
  const [open, setOpen] = useState(false);
  const [allDay, setAllDay] = useState(defaults.allDay);
  const [color, setColor] = useState(defaults.color ?? "red");
  const [icon, setIcon] = useState<string | null>(defaults.icon);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(participantIds.filter((id) => id !== hostId)),
  );
  const toggleMember = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const toast = useToast();

  return (
    <>
      <button onClick={() => setOpen(true)} className={`${btnGhostCls} mt-3 w-full`}>
        イベントを編集する(主催者・管理者)
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="イベントを編集">
        <form
          action={async (formData) => {
            if (submitting.current) return;
            submitting.current = true;
            setError(null);
            try {
              const res = await updateEvent(eventId, formData);
              if (res?.error) {
                setError(res.error);
              } else {
                toast.show("変更を保存しました");
                setOpen(false);
              }
            } catch {
              setError("保存に失敗しました。時間をおいて再度お試しください。");
            } finally {
              submitting.current = false;
            }
          }}
        >
          <label className={labelCls} htmlFor="e-title">イベント名</label>
          <input
            className={inputCls}
            id="e-title"
            name="title"
            required
            defaultValue={defaults.title}
          />

          <label className={labelCls} htmlFor="e-venueId">会場</label>
          <select
            className={inputCls}
            id="e-venueId"
            name="venueId"
            required
            defaultValue={defaults.venueId}
          >
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
              <label className={labelCls} htmlFor="e-date">開始日</label>
              <select
                className={inputCls}
                id="e-date"
                name="date"
                required
                defaultValue={defaults.date}
              >
                {days.map((d) => (
                  <option key={d.key} value={d.key}>{d.label}</option>
                ))}
              </select>
            </div>
            {!allDay && (
              <div>
                <label className={labelCls} htmlFor="e-start">開始時刻</label>
                <input
                  className={inputCls}
                  id="e-start"
                  name="start"
                  type="time"
                  required
                  defaultValue={defaults.start}
                />
              </div>
            )}
            <div>
              <label className={labelCls} htmlFor="e-endDate">終了日</label>
              <select
                className={inputCls}
                id="e-endDate"
                name="endDate"
                required
                defaultValue={defaults.endDate}
              >
                {days.map((d) => (
                  <option key={d.key} value={d.key}>{d.label}</option>
                ))}
              </select>
            </div>
            {!allDay && (
              <div>
                <label className={labelCls} htmlFor="e-end">終了時刻</label>
                <input
                  className={inputCls}
                  id="e-end"
                  name="end"
                  type="time"
                  required
                  defaultValue={defaults.end}
                />
              </div>
            )}
          </div>

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

          <label className={labelCls}>メンバー(主催者は常に参加)</label>
          <div className="flex flex-wrap gap-1.5">
            {members
              .filter((m) => m.userId !== hostId)
              .map((m) => {
                const checked = selected.has(m.userId);
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
                      onChange={() => toggleMember(m.userId)}
                      className="sr-only"
                    />
                    {m.name}
                  </label>
                );
              })}
          </div>
          <p className="mx-0.5 mt-1.5 text-[11px] text-muted">
            追加した人には招待、外した人にはお知らせが届きます。
          </p>

          <label className={labelCls} htmlFor="e-description">説明(任意)</label>
          <input
            className={inputCls}
            id="e-description"
            name="description"
            defaultValue={defaults.description}
            placeholder="持ち物や集合場所など"
          />

          <p className="mx-0.5 mt-3 text-[11px] text-muted">
            保存すると参加登録済みのメンバーへ変更のお知らせ+通知が届きます。
          </p>

          <FormError message={error} />

          <SubmitButton className={`${btnCls} mt-3 w-full py-3.5`}>
            変更を保存する
          </SubmitButton>
        </form>

        {/* 削除は編集モーダル内から(誤操作防止の確認ダイアログつき) */}
        <div className="mt-4 border-t-2 border-dashed border-line pt-1">
          <EventDelete eventId={eventId} />
        </div>
      </Modal>
    </>
  );
}
