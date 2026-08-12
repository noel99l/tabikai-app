import {
  IconCheck,
  IconClock,
  IconMail,
  IconMegaphone,
  IconMoney,
} from "@/components/icons";
import { AppHeader, Card, Pill } from "@/components/ui";
import { sampleNotifications } from "@/lib/sample-data";

const typeMeta = {
  announce: { icon: IconMegaphone, cls: "bg-accent-soft text-accent", pill: <Pill tone="info">全体</Pill> },
  reminder: { icon: IconClock, cls: "bg-pend-soft text-pend", pill: <Pill tone="pend">リマインド</Pill> },
  invite: { icon: IconMail, cls: "bg-violet-soft text-violet", pill: <Pill tone="violet">イベント招待</Pill> },
  expense: { icon: IconMoney, cls: "bg-primary-soft text-primary", pill: <Pill tone="pend">費用</Pill> },
  nudge: { icon: IconClock, cls: "bg-pend-soft text-pend", pill: <Pill tone="pend">承認催促</Pill> },
  done: { icon: IconCheck, cls: "bg-ok-soft text-ok", pill: <Pill tone="ok">確定</Pill> },
} as const;

export default function NotificationsPage() {
  return (
    <>
      <AppHeader title="お知らせ" />
      {sampleNotifications.map((n) => {
        const meta = typeMeta[n.type as keyof typeof typeMeta] ?? typeMeta.done;
        const Icon = meta.icon;
        return (
          <Card key={n.id} className="relative mb-2.5 flex items-start gap-3">
            {n.unread && (
              <span className="absolute top-1/2 -left-2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-accent" />
            )}
            <span
              className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] ${meta.cls}`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              {meta.pill}
              <p className="mt-0.5 text-[13.5px] font-bold">{n.title}</p>
              <p className="text-xs text-muted">{n.body}</p>
            </div>
            <time className="shrink-0 text-[11px] text-muted">{n.time}</time>
          </Card>
        );
      })}
      <p className="mx-0.5 mt-1 text-center text-[11px] text-muted">
        全体アナウンスは誰でも送信できます(送信UIはフェーズ2で実装)
      </p>
    </>
  );
}
