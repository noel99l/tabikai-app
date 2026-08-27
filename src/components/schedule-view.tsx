"use client";

import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { moveEvent } from "@/lib/actions/events";
import { EventIcon, eventColorClass } from "./event-icons";
import { EventForm } from "./event-form";
import { Fab, Modal } from "./modal";

export type ViewEvent = {
  id: string;
  title: string;
  venueId: string;
  startMs: number;
  endMs: number;
  allDay: boolean;
  color: string | null;
  icon: string | null;
  joined: number;
  mine: boolean; // 自分が参加登録済み
  canManage: boolean; // 主催者 or 管理者(ドラッグ移動可)
};

type Props = {
  days: { key: string; label: string }[];
  venues: { id: string; name: string; defaultShow: boolean }[];
  events: ViewEvent[];
  tripStartMs: number;
  tripEndMs: number;
  isMultiDay: boolean;
  members: { userId: string; name: string }[];
  selfId: string;
};

// 会場列ごとのイベントブロック色(ステッカー風のベタ塗り)
const colorClasses = [
  "bg-primary text-white",
  "bg-[#2d7ff9] text-white",
  "bg-violet text-white",
  "bg-ok text-white",
];

const ROW_H = 26; // 30分 = 1行
const LABEL_W = 38;
const LONG_PRESS_MS = 320;
const MOVE_CANCEL_PX = 10;
const MIN_COL_W = 84;

const jstKey = (ms: number) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ms);

// 重なるイベントを横並びレーンに割り当てる(同一会場内)
function layoutLanes(
  evts: { id: string; startRow: number; endRow: number }[],
): Map<string, { lane: number; lanes: number }> {
  const sorted = [...evts].sort(
    (a, b) => a.startRow - b.startRow || b.endRow - a.endRow,
  );
  const result = new Map<string, { lane: number; lanes: number }>();
  const laneEnds: number[] = [];
  let cluster: string[] = [];
  let clusterEnd = -1;

  const closeCluster = () => {
    const lanes = laneEnds.length;
    for (const id of cluster) {
      const r = result.get(id)!;
      result.set(id, { ...r, lanes });
    }
    cluster = [];
    laneEnds.length = 0;
  };

  for (const e of sorted) {
    if (cluster.length > 0 && e.startRow >= clusterEnd) closeCluster();
    let lane = laneEnds.findIndex((end) => end <= e.startRow);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(e.endRow);
    } else {
      laneEnds[lane] = e.endRow;
    }
    result.set(e.id, { lane, lanes: 1 });
    cluster.push(e.id);
    clusterEnd = Math.max(clusterEnd, e.endRow);
  }
  if (cluster.length > 0) closeCluster();
  return result;
}

type Sel = { col: number; a: number; b: number };
type Moving = {
  id: string;
  col: number;
  topRow: number;
  durRows: number;
  origCol: number;
  origRow: number;
  grabOffset: number;
};

// 予定表ビュー: 日付タブ(クライアント即時切替)+グリッド+作成/移動操作
export function ScheduleView({
  days,
  venues: allVenues,
  events,
  tripStartMs,
  tripEndMs,
  isMultiDay,
  members,
  selfId,
}: Props) {
  const todayKey = jstKey(Date.now());
  const [dayIdx, setDayIdx] = useState(() => {
    const i = days.findIndex((d) => d.key === todayKey);
    return i >= 0 ? i : 0;
  });
  const [visibleIds, setVisibleIds] = useState<Set<string>>(
    () => new Set(allVenues.filter((v) => v.defaultShow).map((v) => v.id)),
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [highlightMine, setHighlightMine] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [prefill, setPrefill] = useState<
    { venueId?: string; date?: string; start?: string; end?: string } | undefined
  >(undefined);
  // SSRとのhydration不一致を避けるため、現在時刻はマウント後にのみ確定させる
  const [nowTick, setNowTick] = useState<number | null>(null);
  const [moveOverrides, setMoveOverrides] = useState<
    Record<string, { venueId: string; startMs: number; endMs: number }>
  >({});
  const [, startTransition] = useTransition();

  // 選択(作成)・移動のジェスチャ状態
  const [sel, setSelState] = useState<Sel | null>(null);
  const [moving, setMovingState] = useState<Moving | null>(null);
  const selRef = useRef<Sel | null>(null);
  const movingRef = useRef<Moving | null>(null);
  const selectingRef = useRef(false);
  const suppressClick = useRef(false);
  const lpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{
    x: number;
    y: number;
    kind: "create" | "move";
    mouse: boolean;
    col: number;
    row: number;
    eventId?: string;
    origCol?: number;
    origRow?: number;
    durRows?: number;
    grabOffset?: number;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const setSel = (s: Sel | null) => {
    selRef.current = s;
    setSelState(s);
  };
  const setMoving = (m: Moving | null) => {
    movingRef.current = m;
    setMovingState(m);
  };

  useEffect(() => {
    setNowTick(Date.now());
    const t = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  // ===== 表示会場 =====
  const venues = allVenues.some((v) => visibleIds.has(v.id))
    ? allVenues.filter((v) => visibleIds.has(v.id))
    : allVenues;
  const gridMinWidth = venues.length * MIN_COL_W + LABEL_W;
  const gridCols = `${LABEL_W}px repeat(${venues.length}, minmax(${MIN_COL_W}px, 1fr))`;

  // ===== アクティブ日のデータ =====
  const activeDay = days[dayIdx] ?? days[0];
  const dayStartMs = new Date(`${activeDay.key}T00:00:00+09:00`).getTime();
  const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;

  const merged = useMemo(
    () =>
      events.map((e) =>
        moveOverrides[e.id] ? { ...e, ...moveOverrides[e.id] } : e,
      ),
    [events, moveOverrides],
  );

  const dayTimed = useMemo(
    () =>
      merged
        .filter((e) => !e.allDay && e.startMs < dayEndMs && e.endMs > dayStartMs)
        .map((e) => ({
          ...e,
          clipStartMin: Math.max(0, Math.round((e.startMs - dayStartMs) / 60000)),
          clipEndMin: Math.min(1440, Math.round((e.endMs - dayStartMs) / 60000)),
          continuesBefore: e.startMs < dayStartMs,
          continuesAfter: e.endMs > dayEndMs,
        })),
    [merged, dayStartMs, dayEndMs],
  );
  const dayAllDay = merged.filter(
    (e) => e.allDay && e.startMs < dayEndMs && e.endMs > dayStartMs,
  );
  const visibleVenueIds = new Set(venues.map((v) => v.id));
  const allDayVisible = dayAllDay.filter((e) => visibleVenueIds.has(e.venueId));

  // 表示時間帯
  let startHour = 0;
  let endHour = 24;
  if (!isMultiDay) {
    startHour = 8;
    endHour = 22;
    for (const e of dayTimed) {
      startHour = Math.min(startHour, Math.floor(e.clipStartMin / 60));
      endHour = Math.max(endHour, Math.ceil(e.clipEndMin / 60));
    }
  }
  const totalRows = (endHour - startHour) * 2;
  const rowOf = (min: number) => Math.round((min - startHour * 60) / 30) + 1;

  // 予約可能範囲(企画期間内)
  const clampRow = (r: number) => Math.max(0, Math.min(totalRows, r));
  const bookStartMin = Math.max(0, Math.round((tripStartMs - dayStartMs) / 60000));
  const bookEndMin = Math.min(1440, Math.round((tripEndMs - dayStartMs) / 60000));
  const minRow = clampRow(Math.round((bookStartMin - startHour * 60) / 30));
  const maxRow = clampRow(Math.round((bookEndMin - startHour * 60) / 30));

  // 現在時刻バー(表示日が今日のとき・マウント後のみ)
  const isToday = activeDay.key === todayKey;
  const hasNow = nowTick !== null;
  const nowMin = hasNow ? Math.round((nowTick - dayStartMs) / 60000) : 0;
  const nowY = ((nowMin - startHour * 60) / 30) * ROW_H;
  const showNowLine =
    hasNow && isToday && nowMin >= startHour * 60 && nowMin <= endHour * 60;
  const nowLabel = hasNow
    ? new Intl.DateTimeFormat("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Tokyo",
      }).format(nowTick)
    : "";

  // 重なりレーン(会場ごと)
  const laneMap = useMemo(() => {
    const m = new Map<string, { lane: number; lanes: number }>();
    for (const v of venues) {
      const evts = dayTimed
        .filter((e) => e.venueId === v.id)
        .map((e) => ({
          id: e.id,
          startRow: rowOf(e.clipStartMin),
          endRow: rowOf(e.clipEndMin),
        }));
      for (const [id, r] of layoutLanes(evts)) m.set(id, r);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayTimed, venues, startHour]);

  // 日付切替時: 選択解除+スクロール位置(今日→現在時刻付近 / 24h表示→8:00)
  useEffect(() => {
    setSel(null);
    setMoving(null);
    const el = scrollRef.current;
    if (!el) return;
    if (isToday && !hasNow) return; // 現在時刻の確定を待つ(確定後にhasNowで再実行)
    let target = 0;
    if (showNowLine) target = nowY - 140;
    else if (startHour === 0) target = 16 * ROW_H - 20;
    el.scrollTop = Math.max(0, target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayIdx, hasNow]);

  // ===== ジェスチャ =====
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

  const clearGesture = () => {
    if (lpTimer.current) {
      clearTimeout(lpTimer.current);
      lpTimer.current = null;
    }
    startRef.current = null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    const link = target.closest("a[data-eid]") as HTMLElement | null;
    const c = cellFromPoint(e.clientX, e.clientY);
    if (!c) return;

    if (link) {
      // 既存イベント: タッチは長押し、マウスはドラッグ開始で移動モード
      // (主催者・管理者、当日内に収まるもののみ)
      const eid = link.dataset.eid!;
      const ev = dayTimed.find((x) => x.id === eid);
      if (!ev?.canManage || ev.continuesBefore || ev.continuesAfter) return;
      const origCol = venues.findIndex((v) => v.id === ev.venueId);
      if (origCol < 0) return;
      const origRow = rowOf(ev.clipStartMin) - 1;
      const durRows = rowOf(ev.clipEndMin) - rowOf(ev.clipStartMin);
      const grabOffset = c.row - origRow;
      const isMouse = e.pointerType === "mouse";
      startRef.current = {
        x: e.clientX,
        y: e.clientY,
        kind: "move",
        mouse: isMouse,
        col: c.col,
        row: c.row,
        eventId: eid,
        origCol,
        origRow,
        durRows,
        grabOffset,
      };
      if (lpTimer.current) clearTimeout(lpTimer.current);
      if (!isMouse) {
        lpTimer.current = setTimeout(() => {
          setMoving({ id: eid, col: origCol, topRow: origRow, durRows, origCol, origRow, grabOffset });
          suppressClick.current = true;
          lpTimer.current = null;
        }, LONG_PRESS_MS);
      }
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      return;
    }

    // 空き枠: 作成の範囲選択
    if (c.row < minRow || c.row >= maxRow) return;
    if (e.pointerType === "mouse") {
      setSel({ col: c.col, a: c.row, b: c.row });
      selectingRef.current = true;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      return;
    }
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      kind: "create",
      mouse: false,
      col: c.col,
      row: c.row,
    };
    if (lpTimer.current) clearTimeout(lpTimer.current);
    lpTimer.current = setTimeout(() => {
      const s = startRef.current;
      if (!s) return;
      setSel({ col: s.col, a: s.row, b: s.row });
      selectingRef.current = true;
      lpTimer.current = null;
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    // 移動モード
    if (movingRef.current) {
      const c = cellFromPoint(e.clientX, e.clientY);
      if (!c) return;
      const m = movingRef.current;
      const topRow = Math.max(minRow, Math.min(maxRow - m.durRows, c.row - m.grabOffset));
      if (c.col !== m.col || topRow !== m.topRow) {
        setMoving({ ...m, col: c.col, topRow });
      }
      if (e.pointerType !== "mouse") e.preventDefault();
      return;
    }
    // 作成の範囲選択
    if (selectingRef.current && selRef.current) {
      const c = cellFromPoint(e.clientX, e.clientY);
      if (!c) return;
      const b = Math.max(minRow, Math.min(maxRow - 1, c.row));
      if (b !== selRef.current.b) setSel({ ...selRef.current, b });
      if (e.pointerType !== "mouse") e.preventDefault();
      return;
    }
    // マウス: イベント上でドラッグを始めたら移動モード開始(長押し不要)
    const s = startRef.current;
    if (s && s.kind === "move" && s.mouse && !movingRef.current) {
      const dx = Math.abs(e.clientX - s.x);
      const dy = Math.abs(e.clientY - s.y);
      if (dx > 6 || dy > 6) {
        const c = cellFromPoint(e.clientX, e.clientY);
        const col = c ? c.col : s.origCol!;
        const topRow = Math.max(
          minRow,
          Math.min(maxRow - s.durRows!, (c ? c.row : s.origRow!) - s.grabOffset!),
        );
        setMoving({
          id: s.eventId!,
          col,
          topRow,
          durRows: s.durRows!,
          origCol: s.origCol!,
          origRow: s.origRow!,
          grabOffset: s.grabOffset!,
        });
        suppressClick.current = true;
      }
      return;
    }
    // タッチ: 長押し待機中に動いたらキャンセル(スクロール優先)
    if (startRef.current && lpTimer.current) {
      const dx = Math.abs(e.clientX - startRef.current.x);
      const dy = Math.abs(e.clientY - startRef.current.y);
      if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) clearGesture();
    }
  };

  const toTime = (row: number) => {
    const m = Math.min(startHour * 60 + row * 30, 24 * 60 - 1);
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  };

  const onPointerUp = () => {
    // 移動確定
    if (movingRef.current) {
      const m = movingRef.current;
      if (m.col !== m.origCol || m.topRow !== m.origRow) {
        const ev = merged.find((x) => x.id === m.id)!;
        const newStartMin = startHour * 60 + m.topRow * 30;
        const startMs = dayStartMs + newStartMin * 60000;
        const dur = ev.endMs - ev.startMs;
        const venueId = venues[m.col].id;
        setMoveOverrides((prev) => ({
          ...prev,
          [m.id]: { venueId, startMs, endMs: startMs + dur },
        }));
        startTransition(async () => {
          await moveEvent(m.id, venueId, activeDay.key, newStartMin);
        });
      }
      setMoving(null);
      clearGesture();
      return;
    }
    // 作成確定
    if (selectingRef.current && selRef.current) {
      const s = selRef.current;
      const l = Math.max(minRow, Math.min(s.a, s.b));
      const h =
        s.a === s.b
          ? Math.min(maxRow, l + 2)
          : Math.min(maxRow, Math.max(s.a, s.b) + 1);
      setPrefill({
        venueId: venues[s.col].id,
        date: activeDay.key,
        start: toTime(l),
        end: toTime(h),
      });
      setSel(null);
      selectingRef.current = false;
      setModalOpen(true);
      clearGesture();
      return;
    }
    clearGesture();
  };

  const onPointerCancel = () => {
    setMoving(null);
    setSel(null);
    selectingRef.current = false;
    clearGesture();
  };

  // 選択の表示範囲
  const selLo = sel ? Math.max(minRow, Math.min(sel.a, sel.b)) : 0;
  const selHi = sel
    ? sel.a === sel.b
      ? Math.min(maxRow, selLo + 2)
      : Math.min(maxRow, Math.max(sel.a, sel.b) + 1)
    : 0;

  const toggleVisible = (id: string) => {
    setVisibleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const gestureActive = !!moving || !!sel;

  // グリッドを画面下端(下部ナビの上)まで広げる。
  // パネルの上端位置はフィルタ開閉などで変わるため実測する。
  const [panelTop, setPanelTop] = useState<number | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const el = scrollRef.current;
      if (!el) return;
      setPanelTop(
        Math.round(el.getBoundingClientRect().top + window.scrollY),
      );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [filterOpen]);
  // 下部ナビ(約56px)+余白ぶんを差し引く。安全領域は env() で加算
  const panelHeight =
    panelTop === null
      ? undefined
      : `max(280px, calc(100dvh - ${panelTop}px - 76px - env(safe-area-inset-bottom)))`;

  return (
    <>
      {/* 日付タブ(クライアント切替で即時反映) */}
      <div className="sticky top-0 z-20 -mx-3.5 mb-2 flex gap-1.5 overflow-x-auto bg-screen px-3.5 pt-1 pb-1.5">
        {days.map((d, i) => (
          <button
            key={d.key}
            onClick={() => setDayIdx(i)}
            className={`relative flex-1 rounded-[12px] border-2 border-line px-3 py-2 text-center text-[12.5px] font-bold whitespace-nowrap shadow-[3px_3px_0_var(--color-line)] ${
              i === dayIdx ? "bg-ink text-screen" : "bg-white text-muted"
            }`}
          >
            {d.label}
            {d.key === todayKey && (
              <span
                className={"absolute top-1 right-1.5 h-2 w-2 rounded-full border border-line bg-primary"}
              />
            )}
          </button>
        ))}
      </div>

      {/* フィルタ行 */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          onClick={() => setFilterOpen((o) => !o)}
          className="flex items-center gap-1 text-[12px] font-bold text-ink"
        >
          表示する会場({venues.length}/{allVenues.length})
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-3.5 w-3.5 ${filterOpen ? "rotate-180" : ""}`}
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        <button
          onClick={() => setHighlightMine((v) => !v)}
          className={`rounded-full border-2 border-line px-3 py-1.5 text-[12px] font-bold ${
            highlightMine ? "bg-ink text-screen" : "bg-white text-muted"
          }`}
        >
          自分の予定
        </button>
      </div>
      {filterOpen && (
        <div className="mb-2 flex flex-wrap gap-1.5 rounded-[14px] border-2 border-line bg-white p-2.5 shadow-[3px_3px_0_var(--color-line)]">
          {allVenues.map((v) => {
            const on = venues.some((x) => x.id === v.id);
            return (
              <button
                key={v.id}
                onClick={() => toggleVisible(v.id)}
                className={`rounded-full border-2 border-line px-3 py-1.5 text-[12.5px] font-bold ${
                  on ? "bg-primary text-white" : "bg-white text-muted"
                }`}
              >
                {v.name}
              </button>
            );
          })}
        </div>
      )}

      {/* グリッド(内部スクロール・ヘッダー固定) */}
      <div className="overflow-hidden rounded-[14px] border-2 border-line bg-white shadow-[4px_4px_0_var(--color-line)]">
        <div
          ref={scrollRef}
          className={panelHeight ? "overflow-auto" : "max-h-[62dvh] overflow-auto"}
          style={panelHeight ? { height: panelHeight } : undefined}
        >
          <div style={{ minWidth: gridMinWidth }}>
            <div
              className="sticky top-0 z-20 grid border-b-[3px] border-line bg-white text-center text-[10.5px] font-bold text-ink"
              style={{ gridTemplateColumns: gridCols }}
            >
              <div className="sticky left-0 z-[1] bg-white" />
              {venues.map((v) => (
                <div key={v.id} className="truncate border-l-2 border-line px-0.5 py-2">
                  {v.name}
                </div>
              ))}
            </div>

            {allDayVisible.length > 0 && (
              <div
                className="grid border-b-2 border-dashed border-line bg-line-soft"
                style={{ gridTemplateColumns: gridCols }}
              >
                <div className="sticky left-0 z-[1] flex items-center justify-end bg-line-soft pr-1 text-[9px] font-bold text-muted">
                  終日
                </div>
                {venues.map((v, i) => (
                  <div key={v.id} className="border-l-2 border-line p-1">
                    {allDayVisible
                      .filter((e) => e.venueId === v.id)
                      .map((e) => (
                        <Link
                          key={e.id}
                          href={`/events/${e.id}`}
                          className={`mb-1 block truncate rounded-lg border-2 border-line px-1.5 py-0.5 text-[9.5px] font-bold shadow-[2px_2px_0_var(--color-line)] ${eventColorClass(e.color) ?? colorClasses[i % colorClasses.length]} ${
                            highlightMine && !e.mine ? "opacity-25" : ""
                          }`}
                        >
                          <EventIcon icon={e.icon} className="mr-0.5 inline h-3 w-3 align-[-2px]" />
                          {e.title}
                        </Link>
                      ))}
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <div
                ref={bodyRef}
                className="relative grid select-none [-webkit-touch-callout:none]"
                style={{
                  gridTemplateColumns: gridCols,
                  gridAutoRows: `${ROW_H}px`,
                  touchAction: gestureActive ? "none" : "pan-x pan-y",
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
              >
                {/* 時間ラベル列は左に固定(横スクロールしても見える) */}
                <div
                  aria-hidden
                  className="sticky left-0 z-[3] bg-white"
                  style={{ gridColumn: 1, gridRow: `1 / ${totalRows + 1}` }}
                />
                {Array.from({ length: endHour - startHour }, (_, i) => (
                  <div
                    key={i}
                    className="sticky left-0 z-[4] bg-white pr-1.5 text-right text-[9.5px] tabular-nums text-muted"
                    style={{ gridColumn: 1, gridRow: i * 2 + 1, transform: "translateY(-7px)" }}
                  >
                    {startHour + i}:00
                  </div>
                ))}
                {venues.map((v, i) => (
                  <div
                    key={v.id}
                    className="border-l-2 border-line"
                    style={{ gridColumn: i + 2, gridRow: `1 / ${totalRows + 1}` }}
                  />
                ))}
                {/* 時刻の横罫線(点線・控えめ) */}
                {Array.from({ length: endHour - startHour - 1 }, (_, i) => (
                  <div
                    key={`h-${i}`}
                    aria-hidden
                    className="pointer-events-none border-t-2 border-dashed border-ink/10"
                    style={{
                      gridColumn: `2 / ${venues.length + 2}`,
                      gridRow: (i + 1) * 2 + 1,
                    }}
                  />
                ))}
                {minRow > 0 && (
                  <div
                    aria-hidden
                    className="pointer-events-none bg-[repeating-linear-gradient(45deg,var(--color-line),var(--color-line)_6px,transparent_6px,transparent_12px)] opacity-[0.08]"
                    style={{ gridColumn: `2 / ${venues.length + 2}`, gridRow: `1 / ${minRow + 1}` }}
                  />
                )}
                {maxRow < totalRows && (
                  <div
                    aria-hidden
                    className="pointer-events-none bg-[repeating-linear-gradient(45deg,var(--color-line),var(--color-line)_6px,transparent_6px,transparent_12px)] opacity-[0.08]"
                    style={{
                      gridColumn: `2 / ${venues.length + 2}`,
                      gridRow: `${maxRow + 1} / ${totalRows + 1}`,
                    }}
                  />
                )}

                {sel && (
                  <div
                    className="pointer-events-none z-[1] m-0.5 flex items-center justify-center rounded-lg border-2 border-primary bg-primary/15 text-[10px] font-bold text-primary"
                    style={{ gridColumn: sel.col + 2, gridRow: `${selLo + 1} / ${selHi + 1}` }}
                  >
                    {toTime(selLo)}–{toTime(selHi)}
                  </div>
                )}

                {/* 移動中のゴースト */}
                {moving && (
                  <div
                    className="pointer-events-none z-[2] m-0.5 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/20 text-[10px] font-bold text-primary"
                    style={{
                      gridColumn: moving.col + 2,
                      gridRow: `${moving.topRow + 1} / ${moving.topRow + moving.durRows + 1}`,
                    }}
                  >
                    {toTime(moving.topRow)}–{toTime(moving.topRow + moving.durRows)}
                  </div>
                )}

                {dayTimed.map((e) => {
                  const col = venues.findIndex((v) => v.id === e.venueId);
                  if (col < 0) return null;
                  const lane = laneMap.get(e.id) ?? { lane: 0, lanes: 1 };
                  const isMovingThis = moving?.id === e.id;
                  const faded = highlightMine && !e.mine;
                  return (
                    <Link
                      key={e.id}
                      href={`/events/${e.id}`}
                      data-eid={e.id}
                      onClick={(ev) => {
                        if (suppressClick.current) {
                          ev.preventDefault();
                          suppressClick.current = false;
                        }
                      }}
                      className={`relative overflow-hidden rounded-[10px] border-2 border-line px-1.5 py-1 text-left text-[10px] leading-tight font-bold shadow-[2px_2px_0_var(--color-line)] ${eventColorClass(e.color) ?? colorClasses[col % colorClasses.length]} ${
                        isMovingThis ? "opacity-40" : faded ? "opacity-25" : ""
                      }`}
                      style={{
                        gridColumn: col + 2,
                        gridRow: `${rowOf(e.clipStartMin)} / ${rowOf(e.clipEndMin)}`,
                        width: `calc(${100 / lane.lanes}% - 4px)`,
                        marginLeft: `calc(${(lane.lane * 100) / lane.lanes}% + 2px)`,
                        marginTop: 2,
                        marginBottom: 2,
                        // 主催者・管理者はタッチでもドラッグ移動できるようスクロールを無効化
                        touchAction:
                          e.canManage && !e.continuesBefore && !e.continuesAfter
                            ? "none"
                            : undefined,
                      }}
                    >
                      {e.mine && (
                        <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-current" />
                      )}
                      {e.continuesBefore && <span className="opacity-70">↑前日から </span>}
                      <EventIcon icon={e.icon} className="mr-0.5 inline h-3 w-3 align-[-2px]" />
                      {e.title}
                      <span className="block text-[9px] font-bold opacity-85">
                        {e.joined}人{e.continuesAfter ? " · 翌日へ↓" : ""}
                      </span>
                    </Link>
                  );
                })}
              </div>

              {/* 現在時刻バー */}
              {showNowLine && (
                <div
                  className="pointer-events-none absolute right-0 z-10 -translate-y-1/2"
                  style={{ top: nowY, left: 0 }}
                >
                  <div className="flex items-center">
                    <span className="rounded-full border-2 border-line bg-primary px-1.5 py-px text-[9px] font-bold text-white tabular-nums">
                      {nowLabel}
                    </span>
                    <span className="h-[3px] flex-1 bg-primary" />
                    <span className="h-2.5 w-2.5 rounded-full border-2 border-line bg-primary" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
          defaults={prefill ?? { date: activeDay.key }}
          onSuccess={() => setModalOpen(false)}
        />
      </Modal>
    </>
  );
}
