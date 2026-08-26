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
  { href: "/", label: "ホーム", icon: IconHome },
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
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex max-w-md px-1 pt-1.5 pb-2">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] ${
                active ? "font-bold text-primary" : "text-muted"
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
