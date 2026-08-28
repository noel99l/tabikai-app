import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { schema } from "@/db";
import { AppHeader } from "@/components/app-header";
import {
  IconCalendar,
  IconCheck,
  IconClock,
  IconList,
  IconMail,
  IconMegaphone,
  IconMoney,
  IconUsers,
} from "@/components/icons";
import { MarkRead } from "@/components/mark-read";
import { Card, Pill, btnCls, inputCls } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { sendAnnouncement } from "@/lib/actions/notifications";
import { fmtDateTime } from "@/lib/format";
import { requireTripContext } from "@/lib/session";

const typeMeta = {
  announce: { icon: IconMegaphone, cls: "bg-accent-soft text-accent", label: "全体", tone: "info" as const },
  event_invite: { icon: IconMail, cls: "bg-violet-soft text-violet", label: "イベント", tone: "violet" as const },
  event_reminder: { icon: IconClock, cls: "bg-pend-soft text-pend", label: "リマインド", tone: "pend" as const },
  expense_assigned: { icon: IconMoney, cls: "bg-primary-soft text-primary", label: "費用", tone: "pend" as const },
  expense_confirmed: { icon: IconCheck, cls: "bg-ok-soft text-ok", label: "確定", tone: "ok" as const },
  approval_nudge: { icon: IconClock, cls: "bg-pend-soft text-pend", label: "承認催促", tone: "pend" as const },
  approval_escalation: { icon: IconClock, cls: "bg-pend-soft text-pend", label: "承認催促", tone: "pend" as const },
  settlement: { icon: IconMoney, cls: "bg-ok-soft text-ok", label: "精算", tone: "ok" as const },
  member_request: { icon: IconUsers, cls: "bg-pend-soft text-pend", label: "メンバー", tone: "pend" as const },
  event_update: { icon: IconCalendar, cls: "bg-violet-soft text-violet", label: "イベント", tone: "violet" as const },
  item_update: { icon: IconList, cls: "bg-primary-soft text-primary", label: "買い出し", tone: "info" as const },
};

export default async function NotificationsPage() {
  const { user, trip, db } = await requireTripContext();
  const rows = await db.query.notifications.findMany({
    where: and(
      eq(schema.notifications.tripId, trip.id),
      eq(schema.notifications.userId, user.id),
    ),
    orderBy: [desc(schema.notifications.createdAt)],
    limit: 50,
  });

  return (
    <>
      <AppHeader title="お知らせ" />
      <MarkRead />

      <Card className="mb-3">
        <h3 className="text-sm font-bold">全体アナウンスを送る</h3>
        <p className="mt-0.5 mb-2 text-[11.5px] text-muted">
          全メンバーへお知らせ+通知を送信します(誰でも送信できます)。
        </p>
        <form action={sendAnnouncement} className="flex gap-2">
          <input
            className={inputCls}
            name="body"
            required
            placeholder="夕食が完成しました!大広間へどうぞ"
          />
          <SubmitButton className={`${btnCls} shrink-0`}>送信</SubmitButton>
        </form>
      </Card>

      {rows.length === 0 && (
        <p className="rounded-[14px] border-2 border-line bg-white p-4 text-center shadow-[3px_3px_0_var(--color-line)] text-[12.5px] text-muted">
          お知らせはまだありません。
        </p>
      )}
      {rows.map((n) => {
        const meta = typeMeta[n.type] ?? typeMeta.announce;
        const Icon = meta.icon;
        const inner = (
          <Card className="relative mb-2.5 flex items-start gap-3">
            {!n.readAt && (
              <span className="absolute top-1/2 -left-2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-accent" />
            )}
            <span
              className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] ${meta.cls}`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <Pill tone={meta.tone}>{meta.label}</Pill>
              <span className="mt-0.5 block text-[13.5px] font-bold">{n.title}</span>
              {n.body && <span className="block text-xs text-muted">{n.body}</span>}
              <span className="mt-0.5 block text-[10.5px] text-muted">
                {fmtDateTime(n.createdAt)}
              </span>
            </span>
          </Card>
        );
        return n.link ? (
          <Link key={n.id} href={n.link} className="block">
            {inner}
          </Link>
        ) : (
          <div key={n.id}>{inner}</div>
        );
      })}
    </>
  );
}
