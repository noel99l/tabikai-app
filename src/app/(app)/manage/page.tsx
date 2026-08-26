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
  IconMoney,
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
      href: "/manage/trip",
      icon: IconCalendar,
      title: "旅程・企画設定",
      desc: "開始日時・終了日時・企画名の変更",
    },
    {
      href: "/manage/venues",
      icon: IconHome,
      title: "会場(部屋)管理",
      desc: `予定表の列になる会場を追加・編集(現在 ${venues.value} 件)`,
    },
    {
      href: "/manage/members",
      icon: IconUsers,
      title: "メンバー管理・招待",
      desc: "参加承認・招待リンク・管理者の追加",
      badge: pending.value > 0 ? `承認待ち${pending.value}` : undefined,
    },
    {
      href: "/manage/expenses",
      icon: IconMoney,
      title: "精算(経費の締め)",
      desc: trip.expensesClosedAt
        ? "締め済み・精算リスト公開中"
        : "経費を締めて精算リストを公開",
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

      {/* 管理対象の企画(下のメニューカードと区別するため塗りのヒーロー表示) */}
      <div className="mb-3.5 flex items-center gap-3 rounded-xl bg-primary p-4 text-white">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-white/20">
          <IconSuitcase className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold text-white/75">管理対象の企画</div>
          <div className="truncate text-[15px] font-bold">{trip.name}</div>
        </div>
        <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold">
          管理者
        </span>
      </div>

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
    </>
  );
}
