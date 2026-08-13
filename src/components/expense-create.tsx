"use client";

import { useState } from "react";
import { ExpenseForm } from "./expense-form";
import { Fab, Modal } from "./modal";

type Props = {
  members: { userId: string; name: string }[];
  events: { id: string; title: string }[];
  selfId: string;
};

// 費用一覧の右下FAB → モーダルで費用を追加
export function ExpenseCreateFab(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Fab onClick={() => setOpen(true)} label="費用を追加" />
      <Modal open={open} onClose={() => setOpen(false)} title="費用を追加">
        <ExpenseForm {...props} onSuccess={() => setOpen(false)} />
      </Modal>
    </>
  );
}
