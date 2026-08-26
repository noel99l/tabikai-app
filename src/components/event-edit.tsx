"use client";

import { useRef, useState } from "react";
import { updateEvent } from "@/lib/actions/events";
import { Modal } from "./modal";
import { Spinner } from "./submit-button";
import { btnCls, btnGhostCls, inputCls, labelCls } from "./ui";

type Props = {
  eventId: string;
  venues: { id: string; name: string }[];
  days: { key: string; label: string }[];
  defaults: {
    title: string;
    description: string;
    venueId: string;
    date: string;
    endDate: string;
    start: string;
    end: string;
    allDay: boolean;
  };
};

// イベント詳細からの編集(主催者・管理者のみ)。モーダルで同ページ内完結。
export function EventEdit({ eventId, venues, days, defaults }: Props) {
  const [open, setOpen] = useState(false);
  const [allDay, setAllDay] = useState(defaults.allDay);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);

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
            setPending(true);
            setError(null);
            try {
              const res = await updateEvent(eventId, formData);
              if (res?.error) {
                setError(res.error);
              } else {
                setOpen(false);
              }
            } catch {
              setError("保存に失敗しました。時間をおいて再度お試しください。");
            } finally {
              setPending(false);
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

          {error && (
            <p className="mt-2 rounded-lg bg-accent-soft px-3 py-2 text-[12.5px] font-bold text-accent">
              {error}
            </p>
          )}

          <button
            className={`${btnCls} mt-3 flex w-full items-center justify-center gap-2 py-3.5`}
            disabled={pending}
          >
            {pending && <Spinner />}
            {pending ? "保存中…" : "変更を保存する"}
          </button>
        </form>
      </Modal>
    </>
  );
}
