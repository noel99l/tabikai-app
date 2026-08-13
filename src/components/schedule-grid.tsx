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
  allDayEvents: { id: string; title: string; venueId: string }[];
  dayKey: string; // "YYYY-MM-DD"
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
const LONG_PRESS_MS = 320; // 長押し判定
const MOVE_CANCEL_PX = 10; // これ以上動いたら長押しをキャンセル(=スクロール)

type Sel = { col: number; a: number; b: number };

// カレンダーグリッド。長押し&スライド(PCはドラッグ)で範囲選択してイベントを作成。
export function ScheduleGrid({
  venues: allVenues,
  events,
  allDayEvents,
  dayKey,
  startHour,
  endHour,
  bookableStartMin,
  bookableEndMin,
  days,
  members,
  selfId,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [sel, setSelState] = useState<Sel | null>(null);
  const [selecting, setSelecting] = useState(false); // 選択操作中(この間はスクロールを止める)
  const [modalOpen, setModalOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(
    () => new Set(allVenues.filter((v) => v.defaultShow).map((v) => v.id)),
  );
  const [prefill, setPrefill] = useState<
    { venueId?: string; date?: string; start?: string; end?: string } | undefined
  >(undefined);

  // タッチのジェスチャ管理(タイマー/開始座標)。イベントハンドラの再レンダー遅延に依存しないようrefで保持。
  const selRef = useRef<Sel | null>(null);
  const selectingRef = useRef(false);
  const lpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number; col: number; row: number } | null>(null);
  const setSel = (s: Sel | null) => {
    selRef.current = s;
    setSelState(s);
  };
  const beginSelecting = (v: boolean) => {
    selectingRef.current = v;
    setSelecting(v);
  };

  const venues =
    allVenues.some((v) => visibleIds.has(v.id))
      ? allVenues.filter((v) => visibleIds.has(v.id))
      : allVenues;
  const minColWidth = 84;
  const gridMinWidth = venues.length * minColWidth + LABEL_W;
  const visibleVenueIds = new Set(venues.map((v) => v.id));
  const allDayVisible = allDayEvents.filter((e) => visibleVenueIds.has(e.venueId));
  const totalRows = (endHour - startHour) * 2;

  const clampRow = (r: number) => Math.max(0, Math.min(totalRows, r));
  const minRow = clampRow(Math.round((bookableStartMin - startHour * 60) / 30));
  const maxRow = clampRow(Math.round((bookableEndMin - startHour * 60) / 30));

  useEffect(() => setSel(null), [dayKey]);

  // 24時間表示のときはパネル内を 8:00 付近まで自動スクロール
  useEffect(() => {
    if (startHour !== 0) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = 16 * ROW_H - 20;
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

  const inBookable = (row: number) => row >= minRow && row < maxRow;

  const clearLongPress = () => {
    if (lpTimer.current) {
      clearTimeout(lpTimer.current);
      lpTimer.current = null;
    }
    startRef.current = null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("a")) return; // 既存イベントは詳細へ
    const c = cellFromPoint(e.clientX, e.clientY);
    if (!c || !inBookable(c.row)) return;

    if (e.pointerType === "mouse") {
      // PC: 押下で即選択開始→ドラッグで範囲指定
      setSel({ col: c.col, a: c.row, b: c.row });
      beginSelecting(true);
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      return;
    }

    // タッチ/ペン: 長押しで選択開始
    startRef.current = { x: e.clientX, y: e.clientY, col: c.col, row: c.row };
    clearTimeoutOnly();
    lpTimer.current = setTimeout(() => {
      const s = startRef.current;
      if (!s) return;
      setSel({ col: s.col, a: s.row, b: s.row });
      beginSelecting(true);
      lpTimer.current = null;
    }, LONG_PRESS_MS);
  };

  function clearTimeoutOnly() {
    if (lpTimer.current) {
      clearTimeout(lpTimer.current);
      lpTimer.current = null;
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (selectingRef.current && selRef.current) {
      const c = cellFromPoint(e.clientX, e.clientY);
      if (!c) return;
      const b = Math.max(minRow, Math.min(maxRow - 1, c.row));
      if (b !== selRef.current.b) setSel({ ...selRef.current, b });
      if (e.pointerType !== "mouse") e.preventDefault();
      return;
    }
    // 長押し待機中に動いたらスクロールとみなしてキャンセル
    if (startRef.current && lpTimer.current) {
      const dx = Math.abs(e.clientX - startRef.current.x);
      const dy = Math.abs(e.clientY - startRef.current.y);
      if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) clearLongPress();
    }
  };

  // 選択範囲(行)。単発(a===b)はデフォルト1時間。予約可能範囲でクランプ
  const lo = sel ? Math.max(minRow, Math.min(sel.a, sel.b)) : 0;
  const rawHi = sel ? Math.max(sel.a, sel.b) + 1 : 0;
  const hi = sel
    ? sel.a === sel.b
      ? Math.min(maxRow, lo + 2)
      : Math.min(maxRow, rawHi)
    : 0;

  const toTime = (row: number) => {
    const m = Math.min(startHour * 60 + row * 30, 24 * 60 - 1);
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  };

  const finalize = () => {
    const s = selRef.current;
    clearLongPress();
    beginSelecting(false);
    if (!s) return;
    const l = Math.max(minRow, Math.min(s.a, s.b));
    const h = s.a === s.b ? Math.min(maxRow, l + 2) : Math.min(maxRow, Math.max(s.a, s.b) + 1);
    setPrefill({
      venueId: venues[s.col].id,
      date: dayKey,
      start: toTime(l),
      end: toTime(h),
    });
    setSel(null);
    setModalOpen(true);
  };

  const onPointerUp = () => {
    if (selectingRef.current) finalize();
    else clearLongPress();
  };
  const onPointerCancel = () => {
    clearLongPress();
    beginSelecting(false);
    setSel(null);
  };

  const toggleVisible = (id: string) => {
    setVisibleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const gridCols = `${LABEL_W}px repeat(${venues.length}, minmax(${minColWidth}px, 1fr))`;

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

      {/* 内部スクロールのパネル。縦にスクロールしても会場名ヘッダーは上端に固定される */}
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div ref={scrollRef} className="max-h-[62dvh] overflow-auto">
          <div style={{ minWidth: gridMinWidth }}>
            {/* 会場名ヘッダー(固定) */}
            <div
              className="sticky top-0 z-20 grid border-b border-line bg-white text-center text-[10px] font-bold text-muted"
              style={{ gridTemplateColumns: gridCols }}
            >
              <div className="bg-white" />
              {venues.map((v) => (
                <div key={v.id} className="truncate border-l border-line px-0.5 py-2">
                  {v.name}
                </div>
              ))}
            </div>

            {/* 終日イベント帯 */}
            {allDayVisible.length > 0 && (
              <div
                className="grid border-b border-line bg-screen"
                style={{ gridTemplateColumns: gridCols }}
              >
                <div className="flex items-center justify-end pr-1 text-[9px] text-muted">
                  終日
                </div>
                {venues.map((v, i) => {
                  const evs = allDayVisible.filter((e) => e.venueId === v.id);
                  return (
                    <div key={v.id} className="border-l border-line p-0.5">
                      {evs.map((e) => (
                        <Link
                          key={e.id}
                          href={`/events/${e.id}`}
                          className={`mb-0.5 block truncate rounded border-l-[3px] px-1 py-0.5 text-[9.5px] font-bold ${colorClasses[i % colorClasses.length]}`}
                        >
                          {e.title}
                        </Link>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            <div
              ref={bodyRef}
              className="relative grid touch-none select-none [-webkit-touch-callout:none]"
              style={{
                gridTemplateColumns: gridCols,
                gridAutoRows: `${ROW_H}px`,
                touchAction: selecting ? "none" : "pan-x pan-y",
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
            >
              {Array.from({ length: endHour - startHour }, (_, i) => (
                <div
                  key={i}
                  className="pr-1.5 text-right text-[9.5px] tabular-nums text-muted"
                  style={{ gridColumn: 1, gridRow: i * 2 + 1, transform: "translateY(-7px)" }}
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
              {minRow > 0 && (
                <div
                  aria-hidden
                  className="pointer-events-none bg-[repeating-linear-gradient(45deg,var(--color-line),var(--color-line)_6px,transparent_6px,transparent_12px)] opacity-70"
                  style={{ gridColumn: `2 / ${venues.length + 2}`, gridRow: `1 / ${minRow + 1}` }}
                />
              )}
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
                  className="pointer-events-none z-[1] m-0.5 flex items-center justify-center rounded-lg border-2 border-primary bg-primary/15 text-[10px] font-bold text-primary"
                  style={{ gridColumn: sel.col + 2, gridRow: `${lo + 1} / ${hi + 1}` }}
                >
                  {toTime(lo)}–{toTime(hi)}
                </div>
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
      </div>
      <p className="mx-0.5 mt-1.5 text-center text-[11px] text-muted">
        空き枠を長押し→そのままスライドで時間帯を指定するとイベントを作成できます
        <span className="hidden sm:inline">(PCはドラッグ)</span>
      </p>

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
