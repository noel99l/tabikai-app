"use client";

import { useState, useTransition } from "react";
import { deleteItem, setItemStatus } from "@/lib/actions/items";
import { Modal } from "./modal";
import { Pill } from "./ui";

type Status = "missing" | "planned" | "ready";

type Props = {
  item: {
    id: string;
    name: string;
    note: string | null;
    eventTitle: string;
    addedByName: string;
    assigneeName: string | null;
    method: "bring" | "buy" | null;
    status: Status;
  };
  canDelete: boolean;
};

const statusMeta: Record<Status, { label: string; tone: "pend" | "info" | "ok" }> = {
  missing: { label: "足りない", tone: "pend" },
  planned: { label: "調達予定", tone: "info" },
  ready: { label: "準備OK", tone: "ok" },
};

export function ItemRow({ item, canDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false); // 楽観的更新: 反映前に即座に非表示
  const [pending, startTransition] = useTransition();

  const change = (status: Status, method: "bring" | "buy" = "bring") => {
    if (status === item.status) {
      setOpen(false);
      return;
    }
    setOpen(false);
    setHidden(true); // 別セクションへ移動するため現在位置からは即消す
    startTransition(async () => {
      await setItemStatus(item.id, status, method);
    });
  };

  const remove = () => {
    setOpen(false);
    setHidden(true);
    startTransition(async () => {
      await deleteItem(item.id);
    });
  };

  // サーバー再検証で新しい状態が来るまでの間、楽観的に隠す
  if (hidden) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mb-2.5 flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-white p-3.5 text-left"
      >
        <div className="min-w-0">
          <div className="text-sm font-bold">
            {item.name} <Pill tone="info">{item.eventTitle}</Pill>
          </div>
          <div className="text-[11.5px] text-muted">
            追加: {item.addedByName}
            {item.note ? ` · ${item.note}` : ""}
            {item.assigneeName
              ? ` · ${item.assigneeName} が${item.method === "buy" ? "買い出し" : "持参"}`
              : ""}
          </div>
        </div>
        <Pill tone={statusMeta[item.status].tone}>{statusMeta[item.status].label}</Pill>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={item.name}>
        <div className="rounded-xl border border-line bg-white p-3.5">
          <div className="flex justify-between border-b border-line py-2 text-[13px]">
            <span className="text-muted">関連イベント</span>
            <span className="font-semibold">{item.eventTitle}</span>
          </div>
          {item.note && (
            <div className="flex justify-between border-b border-line py-2 text-[13px]">
              <span className="text-muted">数量・補足</span>
              <span className="font-semibold">{item.note}</span>
            </div>
          )}
          <div className="flex justify-between border-b border-line py-2 text-[13px]">
            <span className="text-muted">追加者</span>
            <span className="font-semibold">{item.addedByName}</span>
          </div>
          <div className="flex justify-between py-2 text-[13px]">
            <span className="text-muted">担当</span>
            <span className="font-semibold">
              {item.assigneeName
                ? `${item.assigneeName}(${item.method === "buy" ? "買い出し" : "持参"})`
                : "未定"}
            </span>
          </div>
        </div>

        <h3 className="mx-0.5 mt-4 mb-2 text-[13px] font-bold text-muted">
          ステータスを変更
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={pending}
            onClick={() => change("planned", "bring")}
            className="rounded-lg bg-primary-soft px-3 py-2.5 text-[13px] font-bold text-primary disabled:opacity-50"
          >
            持っていく(持参)
          </button>
          <button
            disabled={pending}
            onClick={() => change("planned", "buy")}
            className="rounded-lg bg-primary px-3 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
          >
            買ってくる(買い出し)
          </button>
          <button
            disabled={pending}
            onClick={() => change("ready")}
            className="rounded-lg bg-ok-soft px-3 py-2.5 text-[13px] font-bold text-ok disabled:opacity-50"
          >
            準備OKにする
          </button>
          <button
            disabled={pending}
            onClick={() => change("missing")}
            className="rounded-lg bg-pend-soft px-3 py-2.5 text-[13px] font-bold text-pend disabled:opacity-50"
          >
            足りないに戻す
          </button>
        </div>

        {canDelete && (
          <div className="mt-5 text-center">
            <button
              onClick={remove}
              disabled={pending}
              className="text-[12px] font-bold text-accent disabled:opacity-50"
            >
              この項目を削除する
            </button>
          </div>
        )}
      </Modal>
    </>
  );
}
