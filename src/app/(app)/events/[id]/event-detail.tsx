import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { schema } from "@/db";
import { IconPlus } from "@/components/icons";
import { Avatar, Card, Pill, btnCls, btnGhostCls } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { SwitchButton } from "@/components/switch";
import { EventEdit } from "@/components/event-edit";
import {
  addParticipants,
  deleteEvent,
  joinEvent,
  toggleReminder,
} from "@/lib/actions/events";
import { fmtDateLabel, fmtTime, jstDateKey } from "@/lib/format";
import { getApprovedMembers, requireTripContext } from "@/lib/session";

// イベント詳細の本体。/events/[id] ページと、予定表からのモーダル表示で共用する。
export async function EventDetail({ id }: { id: string }) {
  const { user, trip, db, isAdmin } = await requireTripContext();

  const event = await db.query.events.findFirst({
    where: eq(schema.events.id, id),
  });
  if (!event) notFound();

  const [venues, host, participants, members] = await Promise.all([
    db.query.venues.findMany({
      where: eq(schema.venues.tripId, trip.id),
      orderBy: (v, { asc }) => [asc(v.sortOrder)],
    }),
    db.query.users.findFirst({ where: eq(schema.users.id, event.hostId) }),
    db
      .select({
        userId: schema.eventParticipants.userId,
        status: schema.eventParticipants.status,
        remindOptOut: schema.eventParticipants.remindOptOut,
        name: schema.users.name,
      })
      .from(schema.eventParticipants)
      .innerJoin(schema.users, eq(schema.users.id, schema.eventParticipants.userId))
      .where(and(eq(schema.eventParticipants.eventId, id))),
    getApprovedMembers(),
  ]);

  const joined = participants.filter((p) => p.status === "joined");
  const mine = participants.find((p) => p.userId === user.id);
  const canManage = event.hostId === user.id || isAdmin;
  const nonParticipants = members.filter(
    (m) => !joined.some((p) => p.userId === m.userId),
  );
  const venue = venues.find((v) => v.id === event.venueId);

  // 編集フォーム用: 旅程から日付タブを生成(予定表と同じ範囲)
  const days: { key: string; label: string }[] = [];
  for (
    let t = new Date(trip.startsAt);
    days.length < 14;
    t = new Date(t.getTime() + 86400000)
  ) {
    days.push({ key: jstDateKey(t), label: fmtDateLabel(t) });
    if (jstDateKey(t) === jstDateKey(trip.endsAt)) break;
  }

  return (
    <>
      <div className="mt-1 mb-3.5 border-l-4 border-l-primary pl-3">
        <h2 className="text-xl font-bold">{event.title}</h2>
        <p className="text-[13px] text-muted">
          {fmtDateLabel(event.startsAt)} {fmtTime(event.startsAt)} – {fmtTime(event.endsAt)}
        </p>
      </div>

      <Card>
        <dl>
          <div className="flex justify-between border-b border-line py-2 text-[13px]">
            <dt className="text-muted">会場</dt>
            <dd className="font-semibold">{venue?.name}</dd>
          </div>
          <div className="flex justify-between border-b border-line py-2 text-[13px]">
            <dt className="text-muted">主催</dt>
            <dd className="font-semibold">{host?.name}</dd>
          </div>
          {event.description && (
            <div className="flex justify-between gap-4 border-b border-line py-2 text-[13px]">
              <dt className="shrink-0 text-muted">説明</dt>
              <dd className="text-right font-semibold">{event.description}</dd>
            </div>
          )}
          <div className="flex items-center justify-between py-2 text-[13px]">
            <dt className="text-muted">リマインド通知(開始{trip.reminderMinutes}分前)</dt>
            <dd>
              {mine?.status === "joined" ? (
                <form action={toggleReminder.bind(null, id, !mine.remindOptOut)}>
                  <SwitchButton checked={!mine.remindOptOut} />
                </form>
              ) : (
                <span className="text-[11.5px] text-muted">参加登録後に設定可</span>
              )}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="mt-2.5">
        <h3 className="mb-2 text-sm font-bold">
          参加者 <span className="font-medium text-muted">{joined.length} / {members.length}人</span>
        </h3>
        <div className="flex flex-wrap gap-1">
          {joined.map((p) => (
            <Avatar key={p.userId} name={p.name} />
          ))}
        </div>
        {canManage && nonParticipants.length > 0 && (
          <details className="mt-3">
            <summary className="flex cursor-pointer items-center gap-1 text-[12.5px] font-bold text-primary">
              <IconPlus className="h-3.5 w-3.5" />
              参加者を追加(主催者・管理者)
            </summary>
            <form action={addParticipants} className="mt-2">
              <input type="hidden" name="eventId" value={id} />
              <div className="flex flex-wrap gap-1.5">
                {nonParticipants.map((m) => (
                  <label
                    key={m.userId}
                    className="flex items-center gap-1.5 rounded-full border-2 border-line bg-white px-3 py-1.5 text-[12.5px] font-bold has-checked:bg-primary has-checked:text-white"
                  >
                    <input type="checkbox" name="memberIds" value={m.userId} className="sr-only" />
                    {m.name}
                  </label>
                ))}
              </div>
              <SubmitButton className={`${btnGhostCls} mt-2.5 w-full`}>
                選択したメンバーを追加(お知らせ+通知)
              </SubmitButton>
            </form>
          </details>
        )}
      </Card>

      {mine?.status !== "joined" ? (
        <form action={joinEvent.bind(null, id)} className="mt-3">
          <SubmitButton className={`${btnCls} w-full py-3.5`}>
            このイベントに参加登録する
          </SubmitButton>
          <p className="mt-1.5 text-center text-[11px] text-muted">
            参加登録すると開始前にプッシュ通知でリマインドされます
          </p>
        </form>
      ) : (
        <p className="mt-3 text-center">
          <Pill tone="ok">参加登録済み</Pill>
        </p>
      )}

      {canManage && (
        <>
          <EventEdit
            eventId={id}
            venues={venues.map((v) => ({ id: v.id, name: v.name }))}
            days={days}
            defaults={{
              title: event.title,
              description: event.description ?? "",
              venueId: event.venueId,
              // 終日イベントの終了は翌日0:00なので、表示上の最終日に戻す
              date: jstDateKey(event.startsAt),
              endDate: jstDateKey(
                event.allDay
                  ? new Date(event.endsAt.getTime() - 1)
                  : event.endsAt,
              ),
              start: fmtTime(event.startsAt),
              end: fmtTime(event.endsAt),
              allDay: event.allDay,
            }}
          />
          <form action={deleteEvent.bind(null, id)} className="mt-4 pb-2 text-center">
            <SubmitButton spinner={false} className="text-[12px] font-bold text-accent">
              このイベントを削除する(参加者にお知らせが届きます)
            </SubmitButton>
          </form>
        </>
      )}
    </>
  );
}
