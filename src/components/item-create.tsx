"use client";

import { useState } from "react";
import { addItem } from "@/lib/actions/items";
import { Fab, Modal } from "./modal";
import { SubmitButton } from "./submit-button";
import { btnCls, inputCls, labelCls } from "./ui";

type Props = {
  events: { id: string; title: string }[];
};

// 持ち物リストの右下FAB → モーダルで必要なものを追加
export function ItemCreateFab({ events }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Fab onClick={() => setOpen(true)} label="必要なものを追加" />
      <Modal open={open} onClose={() => setOpen(false)} title="必要なものを追加">
        <form
          action={async (formData) => {
            await addItem(formData);
            setOpen(false);
          }}
        >
          <label className={labelCls} htmlFor="item-name">品名</label>
          <input className={inputCls} id="item-name" name="name" required placeholder="炭(3kg)" />
          <label className={labelCls} htmlFor="item-note">数量・補足(任意)</label>
          <input className={inputCls} id="item-note" name="note" placeholder="30人分 など" />
          <label className={labelCls} htmlFor="item-event">関連イベント(任意)</label>
          <select className={inputCls} id="item-event" name="eventId" defaultValue="">
            <option value="">全体(特定イベントなし)</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
          <SubmitButton className={`${btnCls} mt-5 w-full py-3.5`}>追加する</SubmitButton>
        </form>
      </Modal>
    </>
  );
}
