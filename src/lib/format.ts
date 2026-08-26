const TZ = "Asia/Tokyo";

export const yen = (n: number) => `¥${n.toLocaleString("ja-JP")}`;

export function fmtTime(d: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  }).format(d);
}

// 例: "10/10(土)"
export function fmtDateLabel(d: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    timeZone: TZ,
  })
    .format(d)
    .replace(" ", "");
}

// 例: "10/10(土) 18:00"
export function fmtDateTime(d: Date) {
  return `${fmtDateLabel(d)} ${fmtTime(d)}`;
}

// JSTでの日付キー "YYYY-MM-DD"
export function jstDateKey(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// JSTでの 0:00 からの経過分
export function jstMinutes(d: Date) {
  const [h, m] = fmtTime(d).split(":").map(Number);
  return h * 60 + m;
}

// 開始までの残り時間の表示(過去なら null)
export function untilLabel(d: Date, now = new Date()) {
  const diffMin = Math.round((d.getTime() - now.getTime()) / 60000);
  if (diffMin < 0) return null;
  if (diffMin < 60) return `あと${diffMin}分`;
  if (diffMin < 60 * 24) return `あと${Math.floor(diffMin / 60)}時間`;
  return `あと${Math.floor(diffMin / 60 / 24)}日`;
}

// 相対経過時間 "26時間" など
export function sinceLabel(d: Date, now = new Date()) {
  const h = Math.floor((now.getTime() - d.getTime()) / 3600000);
  if (h < 1) return "1時間未満";
  if (h < 24) return `${h}時間`;
  return `${Math.floor(h / 24)}日`;
}

const AVATAR_COLORS = [
  "#0B7285",
  "#D9480F",
  "#6741D9",
  "#B35C00",
  "#2B8A3E",
  "#C92A2A",
  "#495C70",
  "#8D6708",
];

export function avatarColor(name: string) {
  let sum = 0;
  for (const ch of name) sum += ch.codePointAt(0) ?? 0;
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

// "2026-10-10" + "18:00" → JSTのDate
export function jstDate(dateStr: string, timeStr: string) {
  return new Date(`${dateStr}T${timeStr}:00+09:00`);
}

// イベントの開催日時表示
// 例: "10/10(土) 19:30–20:30" / 日跨ぎ "10/10(土) 23:00–10/11(日) 02:00" / 終日 "10/10(土) 終日"
export function fmtEventSpan(start: Date, end: Date, allDay = false) {
  if (allDay) {
    // 終日イベントの終了は「終了日の翌日0:00」なので1ms戻して表示上の最終日を得る
    const last = new Date(end.getTime() - 1);
    return fmtDateLabel(start) === fmtDateLabel(last)
      ? `${fmtDateLabel(start)} 終日`
      : `${fmtDateLabel(start)}–${fmtDateLabel(last)} 終日`;
  }
  return fmtDateLabel(start) === fmtDateLabel(end)
    ? `${fmtDateLabel(start)} ${fmtTime(start)}–${fmtTime(end)}`
    : `${fmtDateTime(start)}–${fmtDateTime(end)}`;
}
