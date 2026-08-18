"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { schema } from "@/db";
import { fmtDateTime, jstDate } from "@/lib/format";
import { notify } from "@/lib/notify";
import { getApprovedMembers, requireTripContext } from "@/lib/session";

export async function createEvent(formData: FormData) {
  const { user, trip, db } = await requireTripContext();
  const title = String(formData.get("title") ?? "").trim();
  const venueId = String(formData.get("venueId") ?? "");
  const date = String(formData.get("date") ?? "");
  const endDate = String(formData.get("endDate") ?? "") || date;
  const start = String(formData.get("start") ?? "");
  const end = String(formData.get("end") ?? "");
  const allDay = formData.get("allDay") === "on";
  const description = String(formData.get("description") ?? "").trim() || null;
  const inviteAll = formData.get("inviteAll") === "on";
  const memberIds = formData.getAll("memberIds").map(String);
  if (!title || !venueId || !date) {
    return { error: "入力が不足しています" };
  }

  let startsAt: Date;
  let endsAt: Date;
  if (allDay) {
    // 終日: 開始日の0:00 〜 終了日の翌日0:00(=終了日いっぱい)
    startsAt = jstDate(date, "00:00");
    endsAt = new Date(jstDate(endDate, "00:00").getTime() + 24 * 60 * 60 * 1000);
    if (endsAt <= startsAt) {
      return { error: "終了日は開始日以降にしてください" };
    }
  } else {
    if (!start || !end) return { error: "開始・終了時刻を入力してください" };
    startsAt = jstDate(date, start);
    endsAt = jstDate(endDate, end);
    if (endsAt <= startsAt) {
      return { error: "終了日時は開始より後にしてください" };
    }
    // 同一会場・同一時間帯の重複は許可(並行開催OK)。予定表では横並びで表示する
  }

  const [event] = await db
    .insert(schema.events)
    .values({
      tripId: trip.id,
      venueId,
      title,
      description,
      startsAt,
      endsAt,
      allDay,
      hostId: user.id,
      inviteAll,
    })
    .returning();

  // 主催者は参加済みとして登録
  await db.insert(schema.eventParticipants).values({
    eventId: event.id,
    userId: user.id,
    status: "joined",
  });

  const members = await getApprovedMembers();
  const inviteeIds = (
    inviteAll ? members.map((m) => m.userId) : memberIds
  ).filter((id) => id !== user.id);
  if (!inviteAll && inviteeIds.length > 0) {
    await db
      .insert(schema.eventParticipants)
      .values(
        inviteeIds.map((userId) => ({
          eventId: event.id,
          userId,
          status: "invited" as const,
        })),
      )
      .onConflictDoNothing();
  }
  await notify(db, trip.id, inviteeIds, {
    type: "event_invite",
    title: `「${title}」に招待されました`,
    body: `${user.name} さんから · ${fmtDateTime(startsAt)}`,
    link: `/events/${event.id}`,
    senderId: user.id,
  });

  // モーダルからの作成なので遷移せず、予定表を再検証して反映する
  revalidatePath("/schedule");
  revalidatePath("/");
}

export async function joinEvent(eventId: string) {
  const { user, db } = await requireTripContext();
  await db
    .insert(schema.eventParticipants)
    .values({ eventId, userId: user.id, status: "joined" })
    .onConflictDoUpdate({
      target: [schema.eventParticipants.eventId, schema.eventParticipants.userId],
      set: { status: "joined" },
    });
  revalidatePath(`/events/${eventId}`);
}

// 主催者・管理者がメンバーを参加者として追加
export async function addParticipants(formData: FormData) {
  const { user, trip, db, isAdmin } = await requireTripContext();
  const eventId = String(formData.get("eventId"));
  const memberIds = formData.getAll("memberIds").map(String);
  const event = await db.query.events.findFirst({
    where: eq(schema.events.id, eventId),
  });
  if (!event) throw new Error("イベントが見つかりません");
  if (event.hostId !== user.id && !isAdmin) {
    throw new Error("主催者または管理者のみ操作できます");
  }
  if (memberIds.length === 0) return;
  await db
    .insert(schema.eventParticipants)
    .values(
      memberIds.map((userId) => ({
        eventId,
        userId,
        status: "joined" as const,
      })),
    )
    .onConflictDoUpdate({
      target: [schema.eventParticipants.eventId, schema.eventParticipants.userId],
      set: { status: "joined" },
    });
  await notify(db, trip.id, memberIds, {
    type: "event_invite",
    title: `「${event.title}」の参加者に追加されました`,
    body: `${user.name} さんが追加 · ${fmtDateTime(event.startsAt)}`,
    link: `/events/${eventId}`,
    senderId: user.id,
  });
  revalidatePath(`/events/${eventId}`);
}

// イベントのドラッグ移動(会場・開始時刻の変更、所要時間は維持)。主催者・管理者のみ。
export async function moveEvent(
  eventId: string,
  venueId: string,
  dayKey: string, // "YYYY-MM-DD"(JST)
  startMin: number, // その日の0:00からの分
) {
  const { user, trip, db, isAdmin } = await requireTripContext();
  const event = await db.query.events.findFirst({
    where: eq(schema.events.id, eventId),
  });
  if (!event || event.tripId !== trip.id) return;
  if (event.hostId !== user.id && !isAdmin) {
    return { error: "主催者または管理者のみ移動できます" };
  }
  const duration = event.endsAt.getTime() - event.startsAt.getTime();
  const dayStart = new Date(`${dayKey}T00:00:00+09:00`).getTime();
  const startsAt = new Date(dayStart + startMin * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + duration);
  await db
    .update(schema.events)
    .set({ venueId, startsAt, endsAt })
    .where(eq(schema.events.id, eventId));

  // 参加登録者(操作者以外)へ変更を通知
  const venue = await db.query.venues.findFirst({
    where: eq(schema.venues.id, venueId),
  });
  const parts = await db.query.eventParticipants.findMany({
    where: and(
      eq(schema.eventParticipants.eventId, eventId),
      eq(schema.eventParticipants.status, "joined"),
      ne(schema.eventParticipants.userId, user.id),
    ),
  });
  await notify(
    db,
    trip.id,
    parts.map((p) => p.userId),
    {
      type: "event_invite",
      title: `「${event.title}」の予定が変更されました`,
      body: `${fmtDateTime(startsAt)} · ${venue?.name ?? ""}`,
      link: `/events/${eventId}`,
      senderId: user.id,
    },
  );
  revalidatePath("/schedule");
  revalidatePath("/");
}

// リマインド通知(開始5分前・デフォルトオン)の個人オン/オフ
export async function toggleReminder(eventId: string, optOut: boolean) {
  const { user, db } = await requireTripContext();
  await db
    .update(schema.eventParticipants)
    .set({ remindOptOut: optOut })
    .where(
      and(
        eq(schema.eventParticipants.eventId, eventId),
        eq(schema.eventParticipants.userId, user.id),
      ),
    );
  revalidatePath(`/events/${eventId}`);
}

export async function deleteEvent(eventId: string) {
  const { user, db, isAdmin } = await requireTripContext();
  const event = await db.query.events.findFirst({
    where: eq(schema.events.id, eventId),
  });
  if (!event) redirect("/schedule");
  if (event.hostId !== user.id && !isAdmin) {
    throw new Error("主催者または管理者のみ削除できます");
  }
  // 参加登録者(主催者以外)へお知らせ
  const participants = await db.query.eventParticipants.findMany({
    where: and(
      eq(schema.eventParticipants.eventId, eventId),
      ne(schema.eventParticipants.userId, user.id),
    ),
  });
  await db.delete(schema.events).where(eq(schema.events.id, eventId));
  await notify(
    db,
    event.tripId,
    participants.map((p) => p.userId),
    {
      type: "announce",
      title: `「${event.title}」は中止になりました`,
      body: `${fmtDateTime(event.startsAt)} の予定が削除されました。`,
      link: "/schedule",
      senderId: user.id,
    },
  );
  redirect("/schedule");
}
