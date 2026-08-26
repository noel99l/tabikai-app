"use client";

import { useMemo, useState, useTransition } from "react";
import { deleteItem, setItemStatus } from "@/lib/actions/items";
import { IconCart, IconCheck } from "./icons";
import { Modal } from "./modal";
import { Pill } from "./ui";

export type BoardItem = {
  id: string;
  name: string;
  note: string | null;
  eventTitle: string;
  addedByName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  method: "bring" | "buy" | null;
  status: "missing" | "planned" | "ready";
  canDelete: boolean;
};

type Status = BoardItem["status"];

const tabMeta: { key: Status; label: string; countCls: string }[] = [
  { key: "missing", label: "足りない", countCls: "text-pend" },
  { key: "planned", label: "調達予定", countCls: "text-primary" },
  { key: "ready", label: "準備OK", countCls: "text-ok" },
];

// 持ち物ボード: ステータスタブ+買い出しリスト+掲載者への通知連携
export function ItemsBoard({
  items,
  selfId,
  selfName,
}: {
  items: BoardItem[];
  selfId: string;
  selfName: string;
}) {
  const [tab, setTab] = useState<Status>("missing");
  const [shopOpen, setShopOpen] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, Partial<BoardItem>>>({});
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [sessionChecked, setSessionChecked] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  // 楽観的更新を反映した一覧
  const merged = useMemo(
    () =>
      items
        .filter((i) => !removed.has(i.id))
        .map((i) => (overrides[i.id] ? { ...i, ...overrides[i.id] } : i)),
    [items, overrides, removed],
  );

  const lists: Record<Status, BoardItem[]> = {
    missing: merged.filter((i) => i.status === "missing"),
    planned: merged.filter((i) => i.status === "planned"),
    ready: merged.filter((i) => i.status === "ready"),
  };
  // 買い出しリスト: 自分が買う予定+このセッションで購入済みにしたもの
  const shopList = merged.filter(
    (i) =>
      (i.status === "planned" && i.assigneeId === selfId && i.method === "buy") ||
      sessionChecked.has(i.id),
  );

  const mutate = (item: BoardItem, status: Status, method: "bring" | "buy" = "bring") => {
    const ov: Partial<BoardItem> =
      status === "missing"
        ? { status, assigneeId: null, assigneeName: null, method: null }
        : {
            status,
            assigneeId: item.assigneeId ?? selfId,
            assigneeName: item.assigneeName ?? selfName,
            method: item.status === "missing" ? method : (item.method ?? method),
          };
    setOverrides((prev) => ({ ...prev, [item.id]: ov }));
    startTransition(async () => {
      await setItemStatus(item.id, status, method);
    });
  };

  const remove = (id: string) => {
    setRemoved((prev) => new Set(prev).add(id));
    startTransition(async () => {
      await deleteItem(id);
    });
  };

  const buyDone = (item: BoardItem) => {
    setSessionChecked((prev) => new Set(prev).add(item.id));
    mutate(item, "ready");
  };

  // 誤タップで購入済みにしてしまった場合の戻し(担当・買い出しはそのまま調達予定へ)
  const buyUndo = (item: BoardItem) => {
    mutate(item, "planned", "buy");
  };

  const renderCard = (i: BoardItem) => (
    <div
      key={i.id}
      className={`mb-2 rounded-xl border border-line bg-white p-3 ${i.status === "ready" ? "opacity-70" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-bold">
            {i.name} <Pill tone="info">{i.eventTitle}</Pill>
          </div>
          <div className="mt-0.5 text-[11.5px] text-muted">
            {i.note ? `${i.note} · ` : ""}掲載: {i.addedByName}
            {i.assigneeName &&
              ` · ${i.assigneeName} が${i.method === "buy" ? "買い出し" : "持参"}`}
          </div>
        </div>
        {i.canDelete && (
          <button
            onClick={() => remove(i.id)}
            aria-label="削除"
            className="shrink-0 px-1 text-[11px] font-bold text-muted"
          >
            ✕
          </button>
        )}
      </div>

      {i.status === "missing" && (
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => mutate(i, "planned", "bring")}
            className="flex-1 rounded-lg bg-primary-soft px-3 py-2 text-xs font-bold text-primary"
          >
            持っていく
          </button>
          <button
            onClick={() => mutate(i, "planned", "buy")}
            className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white"
          >
            買ってくる
          </button>
        </div>
      )}

      {i.status === "planned" && i.assigneeId === selfId && (
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => mutate(i, "ready")}
            className="flex-1 rounded-lg bg-ok px-3 py-2 text-xs font-bold text-white"
          >
            {i.method === "buy" ? "購入した" : "準備できた"}
          </button>
          <button
            onClick={() => mutate(i, "missing")}
            className="shrink-0 rounded-lg bg-line px-3 py-2 text-xs font-bold text-muted"
          >
            取り消す
          </button>
        </div>
      )}

      {i.status === "ready" && (
        <div className="mt-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1 text-[11.5px] font-bold text-ok">
            <IconCheck className="h-3.5 w-3.5" />
            {i.method === "buy" ? "購入済み" : "持参の準備OK"}
          </span>
          <button
            onClick={() => mutate(i, "missing")}
            className="text-[11px] font-bold text-muted underline"
          >
            足りないに戻す
          </button>
        </div>
      )}
    </div>
  );

  const emptyText: Record<Status, string> = {
    missing: "足りないものはありません。右下の＋から掲載できます。",
    planned: "調達予定のものはありません。",
    ready: "準備OKのものはまだありません。",
  };

  return (
    <>
      {/* ステータスタブ */}
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-white p-1">
        {tabMeta.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg py-2 text-center text-[12.5px] font-bold ${
              tab === t.key ? "bg-primary text-white" : "text-muted"
            }`}
          >
            {t.label}{" "}
            <span className={tab === t.key ? "text-white" : t.countCls}>
              {lists[t.key].length}
            </span>
          </button>
        ))}
      </div>

      {/* 買い出しリスト */}
      <button
        onClick={() => {
          setSessionChecked(new Set());
          setShopOpen(true);
        }}
        className="mt-2 mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-primary bg-primary-soft py-3 text-[13.5px] font-bold text-primary"
      >
        <IconCart className="h-5 w-5" />
        買い出しリスト
        <span className="text-[11.5px] font-semibold">
          (買う物 {lists.planned.filter((i) => i.assigneeId === selfId && i.method === "buy").length}
          ・募集中 {lists.missing.length})
        </span>
      </button>

      {lists[tab].length === 0 ? (
        <p className="rounded-xl border border-line bg-white p-4 text-center text-[12.5px] text-muted">
          {emptyText[tab]}
        </p>
      ) : (
        lists[tab].map(renderCard)
      )}
      {tab === "missing" && lists.missing.length > 0 && (
        <p className="mx-0.5 mt-1 text-[11px] text-muted">
          「買ってくる」を選ぶと買い出しリストに入り、購入すると掲載した人へ通知されます。
        </p>
      )}

      {/* 買い出しリスト: 店頭でのチェックリスト */}
      <Modal open={shopOpen} onClose={() => setShopOpen(false)} title="買い出しリスト">
        <h3 className="mx-0.5 mb-2 text-[13px] font-bold text-muted">
          あなたの買い物リスト({shopList.length})
        </h3>
        {shopList.length === 0 ? (
          <p className="rounded-xl border border-line bg-white p-4 text-center text-[12.5px] text-muted">
            買う予定のものはありません。下の募集中から引き受けられます。
          </p>
        ) : (
          shopList.map((i) => {
            const done = i.status === "ready";
            return (
              <button
                key={i.id}
                onClick={() => (done ? buyUndo(i) : buyDone(i))}
                className={`mb-2 flex w-full items-center gap-3 rounded-xl border p-3.5 text-left ${
                  done ? "border-line bg-screen opacity-60" : "border-line bg-white"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                    done ? "border-ok bg-ok text-white" : "border-line"
                  }`}
                >
                  {done && <IconCheck className="h-4 w-4" strokeWidth={2.6} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-[14px] font-bold ${done ? "text-muted line-through" : ""}`}
                  >
                    {i.name}
                  </span>
                  <span className="block text-[11px] text-muted">
                    {i.note ? `${i.note} · ` : ""}
                    {i.eventTitle} · 掲載: {i.addedByName}
                  </span>
                </span>
                <span
                  className={`shrink-0 text-[11px] font-bold ${done ? "text-muted" : "text-ok"}`}
                >
                  {done ? "タップで戻す" : "タップで購入済み"}
                </span>
              </button>
            );
          })
        )}

        <h3 className="mx-0.5 mt-4 mb-2 text-[13px] font-bold text-muted">
          まだ買う人がいないもの({lists.missing.length})
        </h3>
        {lists.missing.length === 0 ? (
          <p className="rounded-xl border border-line bg-white p-4 text-center text-[12.5px] text-muted">
            募集中のものはありません。
          </p>
        ) : (
          lists.missing.map((i) => (
            <div
              key={i.id}
              className="mb-2 flex items-center gap-3 rounded-xl border border-dashed border-pend/60 bg-white p-3"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold">{i.name}</span>
                <span className="block text-[11px] text-muted">
                  {i.note ? `${i.note} · ` : ""}
                  {i.eventTitle} · 掲載: {i.addedByName}
                </span>
              </span>
              <button
                onClick={() => mutate(i, "planned", "buy")}
                className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white"
              >
                ついで買いする
              </button>
            </div>
          ))
        )}

        <p className="mt-3 rounded-lg bg-screen px-3 py-2 text-[11.5px] text-muted">
          購入すると掲載した人に通知されます。立て替えた分は「費用」から割り勘に登録できます。
        </p>
      </Modal>
    </>
  );
}
