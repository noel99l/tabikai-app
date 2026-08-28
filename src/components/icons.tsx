import type { SVGProps } from "react";

// アイコンは絵文字を使わずSVGで描画する(UI方針)
function Svg(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

export const IconBell = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M18 16v-5.5a6 6 0 1 0-12 0V16l-2 2.5h16z" />
    <path d="M10 21a2.2 2.2 0 0 0 4 0" />
  </Svg>
);

export const IconCalendar = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 9.5h18M8 3v4M16 3v4" />
  </Svg>
);

export const IconMoney = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.6" />
    <path d="M6 12h.01M18 12h.01" />
  </Svg>
);

export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.2 12.4l2.6 2.6 5-5.6" />
  </Svg>
);

export const IconList = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <rect x="3" y="4" width="3.6" height="3.6" rx="0.9" />
    <rect x="3" y="10.2" width="3.6" height="3.6" rx="0.9" />
    <rect x="3" y="16.4" width="3.6" height="3.6" rx="0.9" />
    <path d="M10.5 5.8H21M10.5 12H21M10.5 18.2H21" />
  </Svg>
);

export const IconHome = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M4 11l8-7.5L20 11" />
    <path d="M6 9.5V20h12V9.5" />
  </Svg>
);

export const IconPlus = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconBack = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);

export const IconMegaphone = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M3 11l18-5v12L3 14v-3z" />
    <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
  </Svg>
);

export const IconClock = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.2 2" />
  </Svg>
);

export const IconMail = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7.5l9 6 9-6" />
  </Svg>
);

export const IconUsers = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <circle cx="9" cy="8.5" r="3.5" />
    <path d="M3 19.5a6 6 0 0 1 12 0" />
    <circle cx="17.5" cy="9.5" r="2.5" />
    <path d="M17.5 15.5a5 5 0 0 1 3.5 4" />
  </Svg>
);

export const IconCart = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <circle cx="9.5" cy="20" r="1.4" />
    <circle cx="17" cy="20" r="1.4" />
    <path d="M3 4h2.2l2.4 11.2h10.1L20.8 8H6.1" />
  </Svg>
);

export const IconSettings = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
  </Svg>
);

export const IconSuitcase = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <rect x="3.5" y="7" width="17" height="13" rx="2.5" />
    <path d="M9 7V5.5A2.5 2.5 0 0 1 11.5 3h1A2.5 2.5 0 0 1 15 5.5V7M8.5 7v13M15.5 7v13" />
  </Svg>
);

// ドラッグ用グリップ(6点)
export const IconGrip = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <circle cx="9" cy="6" r="1.7" />
    <circle cx="15" cy="6" r="1.7" />
    <circle cx="9" cy="12" r="1.7" />
    <circle cx="15" cy="12" r="1.7" />
    <circle cx="9" cy="18" r="1.7" />
    <circle cx="15" cy="18" r="1.7" />
  </Svg>
);
