import Link from "next/link";
import type { ReactNode } from "react";
import { IconBell } from "./icons";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-line bg-white p-3.5 ${className}`}>
      {children}
    </div>
  );
}

type PillTone = "ok" | "pend" | "info" | "violet";
const pillTones: Record<PillTone, string> = {
  ok: "bg-ok-soft text-ok",
  pend: "bg-pend-soft text-pend",
  info: "bg-primary-soft text-primary",
  violet: "bg-violet-soft text-violet",
};

export function Pill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${pillTones[tone]}`}
    >
      {children}
    </span>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mx-0.5 mt-4 mb-2 text-[13px] font-bold text-muted">{children}</h3>;
}

export function AppHeader({ title, unread = 2 }: { title: string; unread?: number }) {
  return (
    <header className="flex items-center justify-between px-1 pt-3 pb-2.5">
      <h1 className="text-[19px] font-bold">{title}</h1>
      <div className="flex items-center gap-3">
        <Link href="/notifications" aria-label="お知らせ" className="relative p-0.5">
          <IconBell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-accent px-1 text-[9.5px] font-extrabold text-white">
              {unread}
            </span>
          )}
        </Link>
        <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
          ゆ
        </span>
      </div>
    </header>
  );
}
