"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { EventForm } from "./event-form";
import { Fab, Modal } from "./modal";

type GridEvent = {
  id: string;
  title: string;
  venueId: string;
  startMin: number; // JST 0:00からの分(当日にクリップ済み)
  endMin: number;
  joined: number;
  continuesBefore: boolean; // 前日から続く
  continuesAfter: boolean; // 翌日へ続く
};

type Props = {
  venues: { id: string; name: string; defaultShow: boolean }[];
  events: GridEvent[];
  dayKey: string; // "YYYY-MM-DD"
  dayLabel: string; // "10/10(土)"
  startHour: number;
  endHour: number;
  // 予約可能時間帯(0:00からの分)。これより前・後はグレーアウトして予約不可
  bookableStartMin: number;
  bookableEndMin: number;
  // イベント作成モーダル用
  days: { key: string; label: string }[];
  members: { userId: string; name: string }[];
  selfId: string;
};

const colorClasses = [
  "border-l-primary bg-primary-soft text-primary",
  "border-l-accent bg-accent-soft text-accent",
  "border-l-violet bg-violet-soft text-violet",
];

const ROW_H = 26; // 30分 = 1行
const LABEL_W = 38; // 時刻ラベル列の幅

// カレンダーグリッド。空き枠をドラッグ(タップ)で範囲選択してイベント作成へ。
export function ScheduleGrid({
  venues: allVenues,
  events,
  dayKey,
  dayLabel,
  startHour,
  endHour,
  bookableStartMin,
  bookableEndMin,
  days,
  members,
  selfId,
}: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<{ col: number; a: number; b: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  // 表示する会場(初期値=管理画面でデフォルト表示ONの会場)
  const [visibleIds, setVisibleIds] = useState<Set<string>>(
    () => new Set(allVenues.filter((v) => v.defaultShow).map((v) => v.id)),
  );
  const [prefill, setPrefill] = useState<
    { venueId?: string; date?: string; start?: string; end?: string } | undefined
  >(undefined);

  // 実際に列として表示する会場。全部オフのときは全会場を表示(空グリッド回避)
  const venues =
    allVenues.some((v) => visibleIds.has(v.id))
      ? allVenues.filter((v) => visibleIds.has(v.id))
      : allVenues;
  const totalRows = (endHour - startHour) * 2;

  // 予約可能な行の範囲 [minRow, maxRow)(グリッド外はクランプ)
  const clampRow = (r: number) => Math.max(0, Math.min(totalRows, r));
  const minRow = clampRow(Math.round((bookableStartMin - startHour * 60) / 30));
  const maxRow = clampRow(Math.round((bookableEndMin - startHour * 60) / 30));

  // 日付タブを切り替えたら選択をリセット
  useEffect(() => setSel(null), [dayKey]);

  // 24時間表示のときは 8:00 付近まで自動スクロール
  useEffect(() => {
    if (startHour !== 0) return;
    const el = bodyRef.current;
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY + 16 * ROW_H - 150;
    window.scrollTo({ top: Math.max(0, y) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rowOf = (min: number) => Math.round((min - startHour * 60) / 30) + 1;

  const cellFromPoint = (clientX: number, clientY: number) => {
    const el = bodyRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const x = clientX - r.left - LABEL_W;
    const y = clientY - r.top;
    if (x < 0 || y < 0) return null;
    const colW = (r.width - LABEL_W) / venues.length;
    const col = Math.min(venues.length - 1, Math.max(0, Math.floor(x / colW)));
    const row = Math.min(totalRows - 1, Math.max(0, Math.floor(y / ROW_H)));
    return { col, row };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("a")) return; // 既存イベントのタップは除外
    const c = cellFromPoint(e.clientX, e.clientY);
    if (!c) return;
    // 予約可能時間外(グレーアウト部分)は選択させない
    if (c.row < minRow || c.row >= maxRow) return;
    setSel({ col: c.col, a: c.row, b: c.row });
    setDragging(true);
    if (e.pointerType === "mouse") {
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // 合成イベント等でpointerIdが無効な場合は無視
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !sel) return;
    if (e.pointerType !== "mouse") return; // タッチはスクロール操作を優先(タップで1時間選択)
    const c = cellFromPoint(e.clientX, e.clientY);
    if (!c) return;
    // ドラッグ端は予約可能範囲内にクランプ
    const b = Math.max(minRow, Math.min(maxRow - 1, c.row));
    if (b !== sel.b) setSel({ ...sel, b });
  };

  const endDrag = () => setDragging(false);

  // 選択範囲(行)。タップだけの場合はデフォルト1時間(2行)。予約可能範囲でクランプ
  const lo = sel ? Math.max(minRow, Math.min(sel.a, sel.b)) : 0;
  const rawHi = sel ? Math.max(sel.a, sel.b) + 1 : 0;
  const hi = sel
    ? sel.a === sel.b
      ? Math.min(maxRow, lo + 2)
      : Math.min(maxRow, rawHi)
    : 0;

  const toTime = (row: number) => {
    const m = Math.min(startHour * 60 + row * 30, 24 * 60 - 1); // 24:00は23:59に丸める
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  };
  const displayTime = (row: number) => {
    const m = startHour * 60 + row * 30;
    return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
  };

  // 選択範囲からモーダルを開く(遷移しない)
  const create = () => {
    if (!sel) return;
    setPrefill({
      venueId: venues[sel.col].id,
      date: dayKey,
      start: toTime(lo),
      end: toTime(hi),
    });
    setSel(null);
    setModalOpen(true);
  };

  const toggleVisible = (id: string) => {
    setVisibleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      {/* 表示する会場のフィルタ */}
      <div className="mb-2">
        <button
          onClick={() => setFilterOpen((o) => !o)}
          className="flex items-center gap-1 text-[12px] font-bold text-primary"
        >
          表示する会場({venues.length}/{allVenues.length}){filterOpen ? " ▲" : " ▼"}
        </button>
        {filterOpen && (
          <div className="mt-1.5 flex flex-wrap gap-1.5 rounded-xl border border-line bg-white p-2.5">
            {allVenues.map((v) => {
              const on = venues.some((x) => x.id === v.id);
              return (
                <button
                  key={v.id}
                  onClick={() => toggleVisible(v.id)}
                  className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold ${
                    on
                      ? "border-primary bg-primary text-white"
                      : "border-line bg-white text-muted"
                  }`}
                >
                  {on ? "✓ " : ""}
                  {v.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <div style={{ minWidth: venues.length > 4 ? venues.length * 90 + LABEL_W : undefined }}>
          <div
            className="grid border-b border-line text-center text-[10px] font-bold text-muted"
            style={{ gridTemplateColumns: `${LABEL_W}px repeat(${venues.length}, 1fr)` }}
          >
            <div />
            {venues.map((v) => (
              <div key={v.id} className="truncate border-l border-line px-0.5 py-2">
                {v.name}
              </div>
            ))}
          </div>
          <div
            ref={bodyRef}
            className="relative grid select-none"
            style={{
              gridTemplateColumns: `${LABEL_W}px repeat(${venues.length}, 1fr)`,
              gridAutoRows: `${ROW_H}px`,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {Array.from({ length: endHour - startHour }, (_, i) => (
              <div
                key={i}
                className="pr-1.5 text-right text-[9.5px] tabular-nums text-muted"
                style={{
                  gridColumn: 1,
                  gridRow: i * 2 + 1,
                  transform: "translateY(-7px)",
                }}
              >
                {startHour + i}:00
              </div>
            ))}
            {venues.map((v, i) => (
              <div
                key={v.id}
                className="border-l border-line"
                style={{ gridColumn: i + 2, gridRow: `1 / ${totalRows + 1}` }}
              />
            ))}
            {/* 企画開始前のグレーアウト(予約不可) */}
            {minRow > 0 && (
              <div
                aria-hidden
                className="pointer-events-none bg-[repeating-linear-gradient(45deg,var(--color-line),var(--color-line)_6px,transparent_6px,transparent_12px)] opacity-70"
                style={{
                  gridColumn: `2 / ${venues.length + 2}`,
                  gridRow: `1 / ${minRow + 1}`,
                }}
              />
            )}
            {/* 企画終了後のグレーアウト(予約不可) */}
            {maxRow < totalRows && (
              <div
                aria-hidden
                className="pointer-events-none bg-[repeating-linear-gradient(45deg,var(--color-line),var(--color-line)_6px,transparent_6px,transparent_12px)] opacity-70"
                style={{
                  gridColumn: `2 / ${venues.length + 2}`,
                  gridRow: `${maxRow + 1} / ${totalRows + 1}`,
                }}
              />
            )}
            {sel && (
              <div
                className="pointer-events-none z-[1] m-0.5 rounded-lg border-2 border-primary bg-primary/15"
                style={{
                  gridColumn: sel.col + 2,
                  gridRow: `${lo + 1} / ${hi + 1}`,
                }}
              />
            )}
            {events.map((e) => {
              const col = venues.findIndex((v) => v.id === e.venueId);
              if (col < 0) return null;
              return (
                <Link
                  key={e.id}
                  href={`/events/${e.id}`}
                  className={`m-0.5 overflow-hidden rounded-lg border-l-[3px] px-1.5 py-1 text-left text-[10px] leading-tight font-bold ${colorClasses[col % colorClasses.length]}`}
                  style={{
                    gridColumn: col + 2,
                    gridRow: `${rowOf(e.startMin)} / ${rowOf(e.endMin)}`,
                  }}
                >
                  {e.continuesBefore && <span className="opacity-70">↑前日から </span>}
                  {e.title}
                  <span className="block text-[9px] font-medium opacity-75">
                    {e.joined}人{e.continuesAfter ? " · 翌日へ↓" : ""}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      <p className="mx-0.5 mt-1.5 text-center text-[11px] text-muted">
        空き枠をタップ(PCはドラッグで範囲指定)するとイベントを作成できます
      </p>

      {sel && !dragging && (
        <div className="fixed inset-x-0 bottom-[76px] z-20 mx-auto max-w-md px-3.5">
          <div className="flex items-center gap-2.5 rounded-xl border border-primary bg-white p-3 shadow-lg">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold">
                {venues[sel.col].name} · {dayLabel}
              </div>
              <div className="text-[12px] text-muted tabular-nums">
                {displayTime(lo)} – {displayTime(hi)}
              </div>
            </div>
            <button
              onClick={() => setSel(null)}
              className="shrink-0 rounded-lg bg-line px-3 py-2 text-xs font-bold text-muted"
            >
              取消
            </button>
            <button
              onClick={create}
              className="shrink-0 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-white"
            >
              この枠で作成
            </button>
          </div>
        </div>
      )}

      <Fab
        onClick={() => {
          setPrefill(undefined);
          setModalOpen(true);
        }}
        label="会場を予約してイベントを作成"
      />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="イベントを作成">
        <EventForm
          venues={venues}
          days={days}
          members={members}
          selfId={selfId}
          defaults={prefill ?? { date: dayKey }}
          onSuccess={() => setModalOpen(false)}
        />
      </Modal>
    </>
  );
}
