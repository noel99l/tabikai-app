"use client";

import { useState } from "react";
import { deleteVenue, toggleVenueVisible, updateVenue } from "@/lib/actions/venues";
import { Modal } from "./modal";
import { SubmitButton } from "./submit-button";
import { SwitchButton } from "./switch";
import { btnCls, inputCls, labelCls } from "./ui";

type Props = {
  venue: {
    id: string;
    name: string;
    capacity: number | null;
    openFrom: string | null;
    openTo: string | null;
    showInSchedule: boolean;
    eventCount: number;
  };
};

export function VenueRow({ venue: v }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-2.5 rounded-xl border border-line bg-white p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-bold">{v.name}</div>
          <div className="text-[11.5px] text-muted">
            {v.capacity ? `定員${v.capacity}人` : "定員 —"} ·{" "}
            {v.openFrom && v.openTo ? `${v.openFrom}–${v.openTo}` : "終日"} · イベント
            {v.eventCount}件
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            className="text-[12px] font-bold text-primary"
          >
            編集
          </button>
          {v.eventCount === 0 ? (
            <form action={deleteVenue.bind(null, v.id)}>
              <SubmitButton spinner={false} className="text-[12px] font-bold text-accent">
                削除
              </SubmitButton>
            </form>
          ) : (
            <span className="text-[11px] text-muted">イベントあり</span>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
        <span className="text-[12px] text-muted">予定表にデフォルト表示</span>
        <form action={toggleVenueVisible.bind(null, v.id, !v.showInSchedule)}>
          <SwitchButton checked={v.showInSchedule} />
        </form>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="会場を編集">
        <form
          action={async (formData) => {
            await updateVenue(formData);
            setOpen(false);
          }}
        >
          <input type="hidden" name="venueId" value={v.id} />
          <label className={labelCls} htmlFor={`vn-${v.id}`}>会場名</label>
          <input
            className={inputCls}
            id={`vn-${v.id}`}
            name="name"
            defaultValue={v.name}
            required
          />
          <label className={labelCls} htmlFor={`vc-${v.id}`}>定員(任意)</label>
          <input
            className={inputCls}
            id={`vc-${v.id}`}
            name="capacity"
            inputMode="numeric"
            defaultValue={v.capacity ?? ""}
            placeholder="30"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls} htmlFor={`vf-${v.id}`}>利用開始(任意)</label>
              <input
                className={inputCls}
                id={`vf-${v.id}`}
                name="openFrom"
                type="time"
                defaultValue={v.openFrom ?? ""}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor={`vt-${v.id}`}>利用終了(任意)</label>
              <input
                className={inputCls}
                id={`vt-${v.id}`}
                name="openTo"
                type="time"
                defaultValue={v.openTo ?? ""}
              />
            </div>
          </div>
          <SubmitButton className={`${btnCls} mt-4 w-full py-3`}>保存する</SubmitButton>
        </form>
      </Modal>
    </div>
  );
}
