"use client";

import { useState } from "react";
import { IconPlus } from "@/components/icons";
import { AppHeader } from "@/components/ui";
import { sampleEvents, sampleVenues } from "@/lib/sample-data";

// 予定表: 列=会場 × 行=時間帯(Teams風)
const dayConfig = {
  1: { label: "10/10(土)", startHour: 17, endHour: 24 },
  2: { label: "10/11(日)", startHour: 8, endHour: 13 },
} as const;

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const colorClasses = {
  accent: "border-l-accent bg-accent-soft text-accent",
  primary: "border-l-primary bg-primary-soft text-primary",
  violet: "border-l-violet bg-violet-soft text-violet",
};

export default function SchedulePage() {
  const [day, setDay] = useState<1 | 2>(1);
  const { startHour, endHour } = dayConfig[day];
  const rowsPerHour = 2; // 30分刻み
  const totalRows = (endHour - startHour) * rowsPerHour;
  const events = sampleEvents.filter((e) => e.day === day);

  const rowOf = (hhmm: string) =>
    Math.round(((toMin(hhmm) - startHour * 60) / 30)) + 1;

  return (
    <>
      <AppHeader title="予定表" />

      <div className="mb-2.5 flex gap-1.5">
        {([1, 2] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDay(d)}
            className={`flex-1 rounded-[10px] border px-1 py-2 text-[12.5px] font-semibold ${
              day === d
                ? "border-primary bg-primary text-white"
                : "border-line bg-white text-muted"
            }`}
          >
            {dayConfig[d].label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div
          className="grid border-b border-line text-center text-[10px] font-bold text-muted"
          style={{ gridTemplateColumns: "38px repeat(4, 1fr)" }}
        >
          <div />
          {sampleVenues.map((v) => (
            <div key={v} className="truncate border-l border-line px-0.5 py-2">
              {v}
            </div>
          ))}
        </div>
        <div
          className="relative grid"
          style={{
            gridTemplateColumns: "38px repeat(4, 1fr)",
            gridAutoRows: "26px",
          }}
        >
          {Array.from({ length: endHour - startHour }, (_, i) => (
            <div
              key={i}
              className="pr-1.5 text-right text-[9.5px] tabular-nums text-muted"
              style={{ gridColumn: 1, gridRow: i * rowsPerHour + 1, transform: "translateY(-7px)" }}
            >
              {startHour + i}:00
            </div>
          ))}
          {sampleVenues.map((v, i) => (
            <div
              key={v}
              className="border-l border-line"
              style={{ gridColumn: i + 2, gridRow: `1 / ${totalRows + 1}` }}
            />
          ))}
          {events.map((e) => (
            <button
              key={e.id}
              className={`m-0.5 overflow-hidden rounded-lg border-l-[3px] px-1.5 py-1 text-left text-[10px] font-bold leading-tight ${colorClasses[e.color]}`}
              style={{
                gridColumn: sampleVenues.indexOf(e.venue) + 2,
                gridRow: `${rowOf(e.start)} / ${rowOf(e.end)}`,
              }}
            >
              {e.title}
              <span className="block text-[9px] font-medium opacity-75">
                {e.start}–{e.end} · {e.participants}人
              </span>
            </button>
          ))}
        </div>
      </div>

      <button
        aria-label="会場を予約してイベントを作成"
        className="fixed right-4 bottom-24 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40"
      >
        <IconPlus className="h-6 w-6" strokeWidth={2.4} />
      </button>
    </>
  );
}
