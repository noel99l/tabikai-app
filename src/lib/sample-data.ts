// TODO: DB接続後にこのサンプルデータを実データへ置き換える(フェーズ2)

export const sampleTrip = {
  name: "突然の旅会2026",
  startsAt: "2026-10-10T15:00:00+09:00",
  endsAt: "2026-10-11T12:00:00+09:00",
  memberCount: 25,
};

export const sampleVenues = ["大広間", "カラオケ", "BBQ場", "ロビー"];

export type SampleEvent = {
  id: string;
  title: string;
  venue: string;
  day: 1 | 2;
  start: string; // "HH:mm"
  end: string;
  host: string;
  participants: number;
  color: "accent" | "primary" | "violet";
  joined?: boolean;
  invited?: boolean;
};

export const sampleEvents: SampleEvent[] = [
  { id: "e1", title: "火起こし隊", venue: "BBQ場", day: 1, start: "17:00", end: "18:00", host: "たくみ", participants: 4, color: "violet" },
  { id: "e2", title: "夕食", venue: "大広間", day: 1, start: "18:00", end: "19:30", host: "運営", participants: 25, color: "accent", joined: true },
  { id: "e3", title: "集合写真", venue: "ロビー", day: 1, start: "19:30", end: "20:00", host: "運営", participants: 25, color: "violet", joined: true },
  { id: "e4", title: "カラオケ自由枠", venue: "カラオケ", day: 1, start: "20:00", end: "22:00", host: "けんた", participants: 9, color: "primary" },
  { id: "e5", title: "ボードゲーム大会", venue: "大広間", day: 1, start: "21:00", end: "22:30", host: "みさき", participants: 8, color: "primary", invited: true },
  { id: "e6", title: "朝食", venue: "大広間", day: 2, start: "08:00", end: "09:00", host: "運営", participants: 25, color: "accent", joined: true },
  { id: "e7", title: "チェックアウト", venue: "ロビー", day: 2, start: "10:00", end: "10:30", host: "運営", participants: 25, color: "violet", joined: true },
  { id: "e8", title: "精算タイム", venue: "ロビー", day: 2, start: "10:30", end: "11:30", host: "運営", participants: 25, color: "violet" },
];

export type SampleExpense = {
  id: string;
  title: string;
  amount: number;
  paidBy: string;
  splitAll: boolean;
  event?: string;
  approved: number;
  total: number;
};

export const sampleExpenses: SampleExpense[] = [
  { id: "x1", title: "宿泊費", amount: 60000, paidBy: "ゆうすけ", splitAll: true, approved: 25, total: 25 },
  { id: "x2", title: "BBQ食材", amount: 18400, paidBy: "けんた", splitAll: true, approved: 25, total: 25 },
  { id: "x3", title: "カラオケ延長", amount: 4000, paidBy: "みさき", splitAll: false, event: "カラオケ自由枠", approved: 2, total: 4 },
  { id: "x4", title: "タクシー(駅→宿)", amount: 4000, paidBy: "あやか", splitAll: false, event: "夕食", approved: 1, total: 3 },
];

export const samplePendingShares = [
  { id: "s1", expense: "カラオケ延長", paidBy: "みさき", total: 4000, targets: 4, yourShare: 1000 },
  { id: "s2", expense: "タクシー(駅→宿)", paidBy: "あやか", total: 4000, targets: 3, yourShare: 1334 },
];

export type SampleItem = {
  id: string;
  name: string;
  note?: string;
  event: string;
  addedBy: string;
  assignee?: string;
  method?: "bring" | "buy";
  done: boolean;
};

export const sampleItems: SampleItem[] = [
  { id: "i1", name: "炭(3kg)", event: "夕食(BBQ)", addedBy: "けんた", done: false },
  { id: "i2", name: "紙皿・紙コップ", note: "30人分", event: "夕食(BBQ)", addedBy: "みさき", done: false },
  { id: "i3", name: "単3電池(×4)", event: "ボードゲーム大会", addedBy: "みさき", done: false },
  { id: "i4", name: "トランプ・UNO", event: "ボードゲーム大会", addedBy: "みさき", assignee: "みさき", method: "bring", done: false },
  { id: "i5", name: "飲み物(2L×6)", event: "夕食(BBQ)", addedBy: "ゆうすけ", assignee: "けんた", method: "buy", done: false },
  { id: "i6", name: "救急セット", event: "全体", addedBy: "あやか", assignee: "みさき", method: "bring", done: true },
  { id: "i7", name: "Bluetoothスピーカー", event: "全体", addedBy: "ゆうすけ", assignee: "ゆうすけ", method: "bring", done: true },
];

export const sampleNotifications = [
  { id: "n1", type: "announce", title: "夕食が完成しました!", body: "大広間にお集まりください。飲み物は各自持参で。", time: "18:02", unread: true },
  { id: "n2", type: "reminder", title: "まもなく「集合写真」", body: "5分後(19:30)にロビーで開始します。", time: "19:25", unread: true },
  { id: "n3", type: "invite", title: "「ボードゲーム大会」に招待されました", body: "みさき さんから · 21:00〜 大広間", time: "17:45", unread: false },
  { id: "n4", type: "expense", title: "「カラオケ延長」の割り勘対象になりました", body: "みさき さんが立替 · あなたの負担 ¥1,000", time: "22:10", unread: false },
  { id: "n5", type: "nudge", title: "「タクシー(駅→宿)」が24時間未承認です", body: "未承認: しょう · 本人へ催促通知を送信済み", time: "昨日", unread: false },
] as const;

export const yen = (n: number) => `¥${n.toLocaleString("ja-JP")}`;
