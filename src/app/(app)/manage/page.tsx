import Link from "next/link";
import { and, count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { schema } from "@/db";
import { AppHeader } from "@/components/app-header";
import {
  IconBack,
  IconCalendar,
  IconHome,
  IconMegaphone,
  IconSuitcase,
  IconUsers,
} from "@/components/icons";
import { Card, Pill } from "@/components/ui";
import { requireTripContext } from "@/lib/session";

// 管理者コンソール(ハブ)。管理者のみアクセス可能。
export default async function ManagePage() {
  const { trip, db, isAdmin } = await requireTripContext();
  if (!isAdmin) redirect("/");

  const [pending] = await db
    .select({ value: count() })
    .from(schema.tripMembers)
    .where(
      and(
        eq(schema.tripMembers.tripId, trip.id),
        eq(schema.tripMembers.status, "pending"),
      ),
    );
  const [venues] = await db
    .select({ value: count() })
    .from(schema.venues)
    .where(eq(schema.venues.tripId, trip.id));

  const items = [
    {
      href: "/manage/venues",
      icon: IconHome,
      title: "会場(部屋)管理",
      desc: `予定表の列になる会場を追加・編集(現在 ${venues.value} 件)`,
    },
    {
      href: "/manage/trip",
      icon: IconCalendar,
      title: "旅程・企画設定",
      desc: "開始日時・終了日時・企画名の変更",
    },
    {
      href: "/manage/members",
      icon: IconUsers,
      title: "メンバー管理・招待",
      desc: "参加承認と招待リンクの共有",
      badge: pending.value > 0 ? `承認待ち${pending.value}` : undefined,
    },
    {
      href: "/notifications",
      icon: IconMegaphone,
      title: "全体アナウンス",
      desc: "全員へお知らせ+通知を送信",
    },
  ];

  return (
    <>
      <AppHeader title="管理者コンソール" />
      <Link
        href="/"
        className="mb-2 flex items-center gap-1 text-[13px] font-bold text-primary"
      >
        <IconBack className="h-4 w-4" />
        ホームへ戻る
      </Link>

      <Card className="mb-3 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-primary-soft">
          <IconSuitcase className="h-6 w-6 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">{trip.name}</div>
          <div className="text-[11.5px] text-muted">管理対象の企画</div>
        </div>
        <Pill tone="info">管理者</Pill>
      </Card>

      {items.map(({ href, icon: Icon, title, desc, badge }) => (
        <Link key={href} href={href} className="block">
          <Card className="mb-2.5 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-primary-soft">
              <Icon className="h-5 w-5 text-primary" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-sm font-bold">{title}</span>
                {badge && <Pill tone="pend">{badge}</Pill>}
              </span>
              <span className="block text-[11.5px] text-muted">{desc}</span>
            </span>
            <span className="text-muted">›</span>
          </Card>
        </Link>
      ))}

      <p className="mx-0.5 mt-2 text-[11px] text-muted">
        費用の締め・精算リストの公開はフェーズ4で追加予定です。
      </p>
    </>
  );
}
