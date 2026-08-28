"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EventForm } from "./event-form";
import { EventIcon, eventColorClass } from "./event-icons";
import { IconCalendar } from "./icons";
import { Fab, Modal } from "./modal";
import { Avatar } from "./ui";
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

type Member = { userId: string; name: string; emoji: string | null };

type Props = {
  events: Ev[];
  members: Member[];
  venues: { id: string; name: string }[];
  days: { key: string; label: string }[];
  selfId: string;
};

const VIEW_KEY = "events-view";

// 自分/選択メンバーの参加状態ピル
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
function AgendaRow({
  ev,
  status,
  dim = false,
  statusLabelOverride,
}: {
  ev: Ev;
  status: string | undefined;
  dim?: boolean;
  statusLabelOverride?: string;
}) {
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
        {statusLabelOverride ? (
          <span className="ml-auto shrink-0 rounded-full border-2 border-line bg-violet-soft px-2 py-0.5 text-[10px] font-bold text-violet">
            {statusLabelOverride}
          </span>
        ) : (
          <StatusPill status={status} />
        )}
      </Link>
    </div>
  );
}

export function EventsList({ events, members, venues, days, selfId }: Props) {
  // 今日が旅程内なら今日のタブを初期選択
  const [dayIdx, setDayIdx] = useState(() => {
    const today = jstDateKey(new Date());
    const i = days.findIndex((d) => d.key === today);
    return i >= 0 ? i : 0;
  });
  const [view, setView] = useState<"list" | "members">("list");
  const [memberId, setMemberId] = useState(selfId);
  const [modalOpen, setModalOpen] = useState(false);
  const [nowTick, setNowTick] = useState<number | null>(null);

  // 表示ビューを記憶(次回も同じビューで開く)
  useEffect(() => {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === "members") setView("members");
    setNowTick(Date.now());
    const t = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const switchView = (v: "list" | "members") => {
    setView(v);
    localStorage.setItem(VIEW_KEY, v);
  };

  const activeDay = days[dayIdx];
  const isToday = activeDay && jstDateKey(new Date()) === activeDay.key;

  // 選択日の時間指定イベント(開始時間順)と終日イベント
  const { timed, allDay } = useMemo(() => {
    const timed = events
      .filter((e) => !e.allDay && jstDateKey(e.startsAt) === activeDay?.key)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    const allDay = events.filter(
      (e) =>
        e.allDay &&
        activeDay &&
        jstDateKey(e.startsAt) <= activeDay.key &&
        activeDay.key <= jstDateKey(e.endsAt),
    );
    return { timed, allDay };
  }, [events, activeDay]);

  const statusOf = (ev: Ev, userId: string) =>
    ev.participants.find((p) => p.userId === userId)?.status;

  // メンバービュー: 選択メンバーが参加/招待中のイベント
  const memberEvents = useMemo(
    () =>
      timed.filter((e) => {
        const st = statusOf(e, memberId);
        return st === "joined" || st === "invited";
      }),
    [timed, memberId],
  );
  const selectedMember = members.find((m) => m.userId === memberId);

  // 現在時刻ライン(当日のみ)。直後のイベントの直前に挿入する
  const nowLineIdx =
    isToday && nowTick
      ? (view === "list" ? timed : memberEvents).findIndex(
          (e) => e.startsAt.getTime() > nowTick,
        )
      : -1;
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

  return (
    <>
      {/* ビュー切替 */}
      <div className="mb-3 flex gap-1.5 rounded-[13px] border-2 border-line bg-white p-1 shadow-[3px_3px_0_var(--color-line)]">
        <button onClick={() => switchView("list")} className={segCls(view === "list")}>
          リスト
        </button>
        <button onClick={() => switchView("members")} className={segCls(view === "members")}>
          メンバー
        </button>
      </div>

      {/* メンバー選択チップ */}
      {view === "members" && (
        <div className="-mx-3.5 mb-1 flex gap-2 overflow-x-auto px-3.5 pb-2">
          {members.map((m) => {
            const on = m.userId === memberId;
            return (
              <button
                key={m.userId}
                onClick={() => setMemberId(m.userId)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border-2 border-line py-1 pr-3 pl-1 text-[11.5px] font-bold shadow-[2px_2px_0_var(--color-line)] ${
                  on ? "bg-ink text-screen" : "bg-white"
                }`}
              >
                <Avatar name={m.name ?? "?"} emoji={m.emoji} size={22} />
                {m.name}
                {m.userId === selfId ? "(自分)" : ""}
              </button>
            );
          })}
        </div>
      )}

      {/* 日付タブ */}
      <div className="mb-3 flex gap-2">
        {days.map((d, i) => (
          <button
            key={d.key}
            onClick={() => setDayIdx(i)}
            className={`flex-1 rounded-xl border-2 border-line py-2 text-center text-[13px] font-bold shadow-[2px_2px_0_var(--color-line)] ${
              i === dayIdx ? "bg-ink text-screen" : "bg-white"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* 終日(会場確保) */}
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

      {view === "list" ? (
        <>
          {timed.length === 0 && (
            <p className="rounded-[14px] border-2 border-line bg-white p-4 text-center text-[12.5px] text-muted shadow-[3px_3px_0_var(--color-line)]">
              この日のイベントはまだありません。右下の＋から作成できます。
            </p>
          )}
          {timed.map((e, i) => (
            <div key={e.id}>
              {i === nowLineIdx && NowLine}
              <AgendaRow ev={e} status={statusOf(e, selfId)} />
            </div>
          ))}
          {timed.length > 0 && nowLineIdx === -1 && isToday && NowLine}
        </>
      ) : (
        <>
          <p className="mx-0.5 mb-2 text-[11px] font-bold text-muted">
            {selectedMember?.name}さんの予定 {memberEvents.length}件
          </p>
          {memberEvents.length === 0 && (
            <p className="rounded-[14px] border-2 border-line bg-white p-4 text-center text-[12.5px] text-muted shadow-[3px_3px_0_var(--color-line)]">
              この日の予定はありません。
            </p>
          )}
          {memberEvents.map((e, i) => {
            const prev = memberEvents[i - 1];
            const gapMin = prev
              ? Math.round((e.startsAt.getTime() - prev.endsAt.getTime()) / 60000)
              : 0;
            const st = statusOf(e, memberId);
            return (
              <div key={e.id}>
                {gapMin >= 45 && (
                  <div className="mb-2.5 ml-[54px] rounded-[11px] border-2 border-dashed border-ink/35 px-3 py-1.5 text-[10.5px] font-bold text-muted">
                    {fmtTime(prev.endsAt)} – {fmtTime(e.startsAt)} · あき
                  </div>
                )}
                {i === nowLineIdx && NowLine}
                <AgendaRow
                  ev={e}
                  status={st}
                  dim={st === "invited"}
                  statusLabelOverride={st === "invited" ? "招待中" : undefined}
                />
              </div>
            );
          })}
        </>
      )}

      <Fab
        onClick={() => setModalOpen(true)}
        label="イベントを作成"
      />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="イベントを作成">
        <EventForm
          venues={venues}
          days={days}
          members={members.map((m) => ({ userId: m.userId, name: m.name ?? "?" }))}
          selfId={selfId}
          defaults={{ date: activeDay?.key }}
          onSuccess={() => setModalOpen(false)}
        />
      </Modal>
    </>
  );
}
