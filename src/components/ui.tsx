import type { ReactNode } from "react";
import { avatarColor } from "@/lib/format";

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

export function Avatar({
  name,
  size = 28,
  emoji,
}: {
  name: string;
  size?: number;
  emoji?: string | null;
}) {
  // 絵文字アイコンが設定されていればそれを、なければ頭文字+カラーで表示
  if (emoji) {
    return (
      <span
        className="flex items-center justify-center rounded-full bg-line"
        style={{ width: size, height: size, fontSize: size * 0.58 }}
        title={name}
      >
        {emoji}
      </span>
    );
  }
  return (
    <span
      className="flex items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: avatarColor(name),
      }}
      title={name}
    >
      {name.slice(0, 1)}
    </span>
  );
}

export const inputCls =
  "w-full rounded-[10px] border border-line bg-white px-3 py-2.5 text-sm";
export const labelCls = "mt-3 mb-1.5 block text-xs font-bold text-muted";
export const btnCls =
  "rounded-lg bg-primary px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-50";
export const btnGhostCls =
  "rounded-lg bg-primary-soft px-4 py-2.5 text-[13px] font-bold text-primary";
