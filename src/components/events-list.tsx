"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EventForm } from "./event-form";
import { EventIcon, eventColorClass } from "./event-icons";
import { IconCalendar } from "./icons";
import { Fab, Modal } from "./modal";
import { fmtTime, jstDateKey } from "@/lib/format";

type Ev = {
  id: string;
  title: string;
  venueName: string;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  color: string | null;
  icon: string | null;
  participants: { userId: string; status: string }[];
};

type Props = {
  events: Ev[];
  members: { userId: string; name: string }[];
  venues: { id: string; name: string }[];
  days: { key: string; label: string }[];
  selfId: string;
};

const VIEW_KEY = "events-view";

// 自分の参加状態ピル
function StatusPill({ status }: { status: string | undefined }) {
  if (status === "joined")
    return (
      <span className="ml-auto shrink-0 rounded-full border-2 border-line bg-ok-soft px-2 py-0.5 text-[10px] font-bold text-ok">
        参加
      </span>
    );
  if (status === "invited")
    return (
      <span className="ml-auto shrink-0 rounded-full border-2 border-line bg-violet-soft px-2 py-0.5 text-[10px] font-bold text-violet">
        招待
      </span>
    );
  if (status === "declined")
    return (
      <span className="ml-auto shrink-0 rounded-full border-2 border-line bg-screen px-2 py-0.5 text-[10px] font-bold text-muted">
        不参加
      </span>
    );
  return null;
}

// アジェンダ1行(開始/終了時刻+イベントカード)
function AgendaRow({ ev, status, dim = false }: { ev: Ev; status: string | undefined; dim?: boolean }) {
  return (
    <div className="mb-2.5 flex gap-2.5">
      <div className="w-11 shrink-0 pt-2 text-right">
        <div className="font-pop text-[13px] leading-tight tabular-nums">{fmtTime(ev.startsAt)}</div>
        <div className="text-[10px] text-muted tabular-nums">{fmtTime(ev.endsAt)}</div>
      </div>
      <Link
        href={`/events/${ev.id}`}
        className={`relative flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden rounded-[14px] border-2 border-line bg-white py-2.5 pr-3 pl-4 shadow-[3px_3px_0_var(--color-line)] ${
          dim ? "opacity-70" : ""
        }`}
      >
        <span
          className={`absolute inset-y-0 left-0 w-[6px] ${eventColorClass(ev.color) ?? "bg-line-soft"}`}
        />
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border-2 border-line ${
            eventColorClass(ev.color) ?? "bg-primary-soft text-primary"
          }`}
        >
          {ev.icon ? (
            <EventIcon icon={ev.icon} className="h-4 w-4" />
          ) : (
            <IconCalendar className="h-4 w-4" />
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-bold">{ev.title}</span>
          <span className="block truncate text-[10.5px] text-muted">
            {ev.venueName} · 参加
            {ev.participants.filter((p) => p.status === "joined").length}人
          </span>
        </span>
        <StatusPill status={status} />
      </Link>
    </div>
  );
}

// イベントリスト: 全日を縦積みで表示([すべて|自分の予定]で絞り込み)
export function EventsList({ events, members, venues, days, selfId }: Props) {
  const [view, setView] = useState<"all" | "mine">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [nowTick, setNowTick] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === "mine") setView("mine");
    setNowTick(Date.now());
    const t = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const switchView = (v: "all" | "mine") => {
    setView(v);
    localStorage.setItem(VIEW_KEY, v);
  };

  const myStatus = (ev: Ev) => ev.participants.find((p) => p.userId === selfId)?.status;

  // 日ごとにまとめる(すべて縦積み)。非表示・プライバシー保護会場の
  // 除外はサーバー側(events/page.tsx)で行っている
  const byDay = useMemo(() => {
    const base =
      view === "mine"
        ? events.filter((e) => {
            const st = myStatus(e);
            return st === "joined" || st === "invited";
          })
        : events;
    return days.map((d) => ({
      day: d,
      timed: base
        .filter((e) => !e.allDay && jstDateKey(e.startsAt) === d.key)
        .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()),
      allDay: base.filter(
        (e) => e.allDay && jstDateKey(e.startsAt) <= d.key && d.key <= jstDateKey(e.endsAt),
      ),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, days, view, selfId]);

  const todayKey = jstDateKey(new Date());
  const nowLabel = nowTick
    ? new Date(nowTick).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Tokyo",
      })
    : "";
  const NowLine = (
    <div className="mb-2.5 ml-[54px] flex items-center gap-2">
      <span className="rounded-full border-2 border-line bg-primary px-2 py-px text-[9.5px] font-bold text-white">
        {nowLabel}
      </span>
      <span className="h-[3px] flex-1 rounded bg-primary" />
    </div>
  );

  const segCls = (on: boolean) =>
    `flex-1 rounded-[9px] py-2 text-center text-[12.5px] font-bold ${
      on ? "bg-ink text-screen" : "text-muted"
    }`;
  const total = byDay.reduce((s, d) => s + d.timed.length, 0);

  return (
    <>
      {/* すべて / 自分の予定 */}
      <div className="mb-3 flex gap-1.5 rounded-[13px] border-2 border-line bg-white p-1 shadow-[3px_3px_0_var(--color-line)]">
        <button onClick={() => switchView("all")} className={segCls(view === "all")}>
          すべて
        </button>
        <button onClick={() => switchView("mine")} className={segCls(view === "mine")}>
          自分の予定
        </button>
      </div>

      {total === 0 && (
        <p className="rounded-[14px] border-2 border-line bg-white p-4 text-center text-[12.5px] text-muted shadow-[3px_3px_0_var(--color-line)]">
          {view === "mine"
            ? "参加・招待中のイベントはありません。"
            : "イベントはまだありません。右下の＋から作成できます。"}
        </p>
      )}

      {byDay.map(({ day, timed, allDay }) => {
        if (timed.length === 0 && allDay.length === 0) return null;
        const isToday = day.key === todayKey;
        const nowLineIdx =
          isToday && nowTick ? timed.findIndex((e) => e.startsAt.getTime() > nowTick) : -1;
        return (
          <section key={day.key} className="mb-4">
            {/* 日付見出し(スクロール中も見えるように上部に固定) */}
            <div className="sticky top-0 z-10 -mx-3.5 mb-2 bg-screen px-3.5 py-1.5">
              <span
                className={`inline-block rounded-full border-2 border-line px-3.5 py-1 font-pop text-[13px] shadow-[2px_2px_0_var(--color-line)] ${
                  isToday ? "bg-ink text-screen" : "bg-white"
                }`}
              >
                {day.label}
                {isToday ? " · 今日" : ""}
              </span>
            </div>

            {allDay.map((e) => (
              <Link
                key={e.id}
                href={`/events/${e.id}`}
                className="mb-2.5 flex items-center gap-2 rounded-xl border-2 border-dashed border-line bg-white/60 px-3 py-2 text-[11px] font-bold text-muted"
              >
                <IconCalendar className="h-3.5 w-3.5" />
                終日 · {e.title} · {e.venueName}
              </Link>
            ))}

            {timed.map((e, i) => (
              <div key={e.id}>
                {i === nowLineIdx && NowLine}
                <AgendaRow
                  ev={e}
                  status={myStatus(e)}
                  dim={view === "mine" && myStatus(e) === "invited"}
                />
              </div>
            ))}
            {timed.length > 0 && nowLineIdx === -1 && isToday && NowLine}
          </section>
        );
      })}

      <Fab onClick={() => setModalOpen(true)} label="イベントを作成" />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="イベントを作成">
        <EventForm
          venues={venues}
          days={days}
          members={members}
          selfId={selfId}
          defaults={{ date: days.find((d) => d.key === todayKey)?.key ?? days[0]?.key }}
          onSuccess={() => setModalOpen(false)}
        />
      </Modal>
    </>
  );
}
