import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { schema } from "@/db";
import { AppHeader } from "@/components/app-header";
import { IconPlus } from "@/components/icons";
import { fmtDateLabel, jstDateKey, jstMinutes } from "@/lib/format";
import { requireTripContext } from "@/lib/session";

const colorClasses = [
  "border-l-primary bg-primary-soft text-primary",
  "border-l-accent bg-accent-soft text-accent",
  "border-l-violet bg-violet-soft text-violet",
];

// 予定表: 列=会場 × 行=時間帯(Teams風)。日付タブはURLクエリ ?day=
export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const { trip, db } = await requireTripContext();
  const { day } = await searchParams;

  // 旅行日程(管理者設定)から日付タブを生成
  const days: { key: string; label: string }[] = [];
  for (
    let t = new Date(trip.startsAt);
    days.length < 14;
    t = new Date(t.getTime() + 86400000)
  ) {
    days.push({ key: jstDateKey(t), label: fmtDateLabel(t) });
    if (jstDateKey(t) === jstDateKey(trip.endsAt)) break;
  }
  const todayKey = jstDateKey(new Date());
  const defaultIdx = Math.max(0, days.findIndex((d) => d.key === todayKey));
  const dayIdx = Math.min(days.length - 1, Number(day ?? defaultIdx) || 0);
  const activeKey = days[dayIdx]?.key;

  const venues = await db.query.venues.findMany({
    where: eq(schema.venues.tripId, trip.id),
    orderBy: (v, { asc }) => [asc(v.sortOrder)],
  });

  const events = await db
    .select({
      id: schema.events.id,
      title: schema.events.title,
      venueId: schema.events.venueId,
      startsAt: schema.events.startsAt,
      endsAt: schema.events.endsAt,
      joined: count(schema.eventParticipants.userId),
    })
    .from(schema.events)
    .leftJoin(
      schema.eventParticipants,
      eq(schema.eventParticipants.eventId, schema.events.id),
    )
    .where(eq(schema.events.tripId, trip.id))
    .groupBy(schema.events.id);

  const dayEvents = events.filter((e) => jstDateKey(e.startsAt) === activeKey);

  // 表示時間帯: イベトに合わせて拡張(既定 8:00–22:00)
  let startHour = 8;
  let endHour = 22;
  for (const e of dayEvents) {
    startHour = Math.min(startHour, Math.floor(jstMinutes(e.startsAt) / 60));
    endHour = Math.max(endHour, Math.ceil(jstMinutes(e.endsAt) / 60));
  }
  const totalRows = (endHour - startHour) * 2; // 30分刻み
  const rowOf = (min: number) => Math.round((min - startHour * 60) / 30) + 1;

  return (
    <>
      <AppHeader title="予定表" />

      <div className="mb-2.5 flex gap-1.5 overflow-x-auto">
        {days.map((d, i) => (
          <Link
            key={d.key}
            href={`/schedule?day=${i}`}
            className={`flex-1 rounded-[10px] border px-3 py-2 text-center text-[12.5px] font-semibold whitespace-nowrap ${
              i === dayIdx
                ? "border-primary bg-primary text-white"
                : "border-line bg-white text-muted"
            }`}
          >
            {d.label}
          </Link>
        ))}
      </div>

      {venues.length === 0 ? (
        <p className="rounded-xl border border-line bg-white p-4 text-center text-[12.5px] text-muted">
          会場が未登録です。管理者がイベント設定から会場を追加してください。
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <div style={{ minWidth: venues.length > 4 ? venues.length * 90 + 38 : undefined }}>
            <div
              className="grid border-b border-line text-center text-[10px] font-bold text-muted"
              style={{ gridTemplateColumns: `38px repeat(${venues.length}, 1fr)` }}
            >
              <div />
              {venues.map((v) => (
                <div key={v.id} className="truncate border-l border-line px-0.5 py-2">
                  {v.name}
                </div>
              ))}
            </div>
            <div
              className="relative grid"
              style={{
                gridTemplateColumns: `38px repeat(${venues.length}, 1fr)`,
                gridAutoRows: "26px",
              }}
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
              {dayEvents.map((e) => {
                const col = venues.findIndex((v) => v.id === e.venueId);
                if (col < 0) return null;
                return (
                  <Link
                    key={e.id}
                    href={`/events/${e.id}`}
                    className={`m-0.5 overflow-hidden rounded-lg border-l-[3px] px-1.5 py-1 text-left text-[10px] leading-tight font-bold ${colorClasses[col % colorClasses.length]}`}
                    style={{
                      gridColumn: col + 2,
                      gridRow: `${rowOf(jstMinutes(e.startsAt))} / ${rowOf(jstMinutes(e.endsAt))}`,
                    }}
                  >
                    {e.title}
                    <span className="block text-[9px] font-medium opacity-75">
                      {e.joined}人
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Link
        href="/schedule/new"
        aria-label="会場を予約してイベントを作成"
        className="fixed right-4 bottom-24 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40"
      >
        <IconPlus className="h-6 w-6" strokeWidth={2.4} />
      </Link>
    </>
  );
}
