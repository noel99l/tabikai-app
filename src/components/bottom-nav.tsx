"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconCalendar,
  IconCheck,
  IconHome,
  IconList,
  IconMoney,
} from "./icons";

const tabs = [
  { href: "/home", label: "ホーム", icon: IconHome },
  { href: "/schedule", label: "予定表", icon: IconCalendar },
  { href: "/items", label: "買い出し", icon: IconList },
  { href: "/expenses", label: "費用", icon: IconMoney },
  { href: "/approvals", label: "承認", icon: IconCheck },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="メインナビゲーション"
      className="fixed inset-x-0 bottom-0 z-10 border-t-[3px] border-line bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex max-w-md px-1 pt-1.5 pb-2">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active =
            pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              // 下部タブは常に見えているので、動的ページも本文まで事前取得して
              // 初回遷移からキャッシュ表示できるようにする
              prefetch={true}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] ${
                active ? "bg-ink font-bold text-screen" : "text-muted"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
