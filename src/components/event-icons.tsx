import type { SVGProps } from "react";

// イベントに設定できるカラーとアイコン(SVG)。
// キーをDB(events.color / events.icon)に保存し、表示時にここで引く。

export const EVENT_COLORS: { key: string; label: string; cls: string }[] = [
  { key: "red", label: "レッド", cls: "bg-primary text-white" },
  { key: "blue", label: "ブルー", cls: "bg-[#2d7ff9] text-white" },
  { key: "violet", label: "バイオレット", cls: "bg-violet text-white" },
  { key: "green", label: "グリーン", cls: "bg-ok text-white" },
  { key: "pink", label: "ピンク", cls: "bg-[#e8467c] text-white" },
];

export const eventColorClass = (key: string | null | undefined) =>
  EVENT_COLORS.find((c) => c.key === key)?.cls ?? null;

// スウォッチ表示用(ピッカーの丸)
export const eventSwatchClass = (key: string) =>
  ({
    red: "bg-primary",
    blue: "bg-[#2d7ff9]",
    violet: "bg-violet",
    green: "bg-ok",
    pink: "bg-[#e8467c]",
  })[key] ?? "bg-primary";

function Svg(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

const ICONS: Record<string, (p: SVGProps<SVGSVGElement>) => React.ReactNode> = {
  meal: (p) => (
    <Svg {...p}>
      <path d="M4 11h16" />
      <path d="M5 11a7 7 0 0 1 14 0" />
      <path d="M7 15h10M9 18h6" />
    </Svg>
  ),
  bbq: (p) => (
    <Svg {...p}>
      <path d="M6 13c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M4 16h16M8 19h8" />
      <path d="M9 4v1.5M12 3v1.5M15 4v1.5" />
    </Svg>
  ),
  drink: (p) => (
    <Svg {...p}>
      <path d="M7 4h9v16a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 7 20z" />
      <path d="M16 8h2.5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H16" />
      <path d="M7 9h9" />
    </Svg>
  ),
  cafe: (p) => (
    <Svg {...p}>
      <path d="M5 9h11v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" />
      <path d="M16 10h2a2.5 2.5 0 0 1 0 5h-2" />
      <path d="M8 3.5c0 1-1 1.5-1 2.5M12 3.5c0 1-1 1.5-1 2.5" />
    </Svg>
  ),
  karaoke: (p) => (
    <Svg {...p}>
      <rect x="9" y="3" width="6" height="10" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0" />
      <path d="M12 17v4M9 21h6" />
    </Svg>
  ),
  game: (p) => (
    <Svg {...p}>
      <path d="M6 8h12a4 4 0 0 1 4 4.5l-.6 4A2.7 2.7 0 0 1 16.7 18L15 16H9l-1.7 2A2.7 2.7 0 0 1 2.6 16.5l-.6-4A4 4 0 0 1 6 8z" />
      <path d="M8 11v3M6.5 12.5h3" />
      <circle cx="16" cy="11.5" r="0.6" fill="currentColor" />
      <circle cx="18" cy="13.5" r="0.6" fill="currentColor" />
    </Svg>
  ),
  bath: (p) => (
    <Svg {...p}>
      <path d="M4 13h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
      <path d="M6 13V6a2 2 0 0 1 4 0" />
      <path d="M13 8c0 1-1 1.5-1 2.5M17 8c0 1-1 1.5-1 2.5" />
    </Svg>
  ),
  camera: (p) => (
    <Svg {...p}>
      <path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </Svg>
  ),
  cart: (p) => (
    <Svg {...p}>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="17" cy="20" r="1.4" />
      <path d="M3 4h2l2.6 12.5h11L21 8H6.2" />
    </Svg>
  ),
  car: (p) => (
    <Svg {...p}>
      <path d="M5 16l1.5-6a2 2 0 0 1 2-1.5h7a2 2 0 0 1 2 1.5L19 16" />
      <path d="M4 16h16v3.5h-2.5V18h-11v1.5H4z" />
      <circle cx="8" cy="16" r="0.6" fill="currentColor" />
      <circle cx="16" cy="16" r="0.6" fill="currentColor" />
    </Svg>
  ),
  fire: (p) => (
    <Svg {...p}>
      <path d="M12 3c1 3-3 4.5-3 8a3 3 0 0 0 6 0c0-1.5-1-2.5-1-2.5s3 1.5 3 5a5 5 0 0 1-10 0c0-5 5-6.5 5-10.5z" />
    </Svg>
  ),
  star: (p) => (
    <Svg {...p}>
      <path d="M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z" />
    </Svg>
  ),
};

export const EVENT_ICON_KEYS = Object.keys(ICONS);

export const EVENT_ICON_LABELS: Record<string, string> = {
  meal: "ごはん",
  bbq: "BBQ",
  drink: "乾杯",
  cafe: "カフェ",
  karaoke: "カラオケ",
  game: "ゲーム",
  bath: "おふろ",
  camera: "カメラ",
  cart: "買い出し",
  car: "移動",
  fire: "焚き火",
  star: "スター",
};

export function EventIcon({
  icon,
  className = "h-4 w-4",
}: {
  icon: string | null | undefined;
  className?: string;
}) {
  const render = icon ? ICONS[icon] : undefined;
  if (!render) return null;
  return <>{render({ className })}</>;
}
