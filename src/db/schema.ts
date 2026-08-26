import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// ============ enums ============

export const memberRole = pgEnum("member_role", ["admin", "member"]);
export const memberStatus = pgEnum("member_status", [
  "pending", // Googleログイン済み・参加承認待ち
  "approved",
  "rejected",
]);
export const participantStatus = pgEnum("participant_status", [
  "invited",
  "joined",
  "declined",
]);
export const shareStatus = pgEnum("share_status", [
  "pending", // 本人の承認待ち
  "approved", // 本人が承認
  "forced", // 主催者/管理者が「承認として確定」
  "excluded", // 主催者/管理者が「割り勘対象から外す」
  "rejected", // 本人が否認(主催者/管理者が最終判断する)
]);
export const itemMethod = pgEnum("item_method", ["bring", "buy"]); // 持参 / 買い出し
export const notificationType = pgEnum("notification_type", [
  "announce", // 全体アナウンス
  "event_invite", // イベント招待・参加者追加
  "event_reminder", // 開始5分前リマインド
  "expense_assigned", // 割り勘対象に追加
  "expense_confirmed", // 費用確定
  "approval_nudge", // 24h未承認の催促(本人向け)
  "approval_escalation", // 24h未承認のエスカレーション(主催者/管理者向け)
  "settlement", // 精算確定
  "item_update", // 持ち物の引き受け・購入完了・取り消し(掲載者向け)
]);

// ============ users / auth ============

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  googleSub: text("google_sub").unique(), // Google OAuth subject
  email: text("email").notNull().unique(),
  name: text("name").notNull(), // 表示名(初回に本人が設定)
  image: text("image"), // Googleのプロフィール画像URL
  avatarEmoji: text("avatar_emoji"), // アイコンとして使う絵文字(任意)
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }), // 表示名設定完了。null=未設定
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============ trip (企画) ============

export const trips = pgTable("trips", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"), // 未登録時は標準アイコン
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  reminderMinutes: integer("reminder_minutes").default(5).notNull(), // イベント開始何分前にリマインド
  autoApprove: boolean("auto_approve").default(false).notNull(), // 参加リクエストの自動承認モード
  expensesClosedAt: timestamp("expenses_closed_at", { withTimezone: true }), // 経費入力の締め
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const tripMembers = pgTable(
  "trip_members",
  {
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRole("role").default("member").notNull(),
    status: memberStatus("status").default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.tripId, t.userId] })],
);

// 管理者招待URL(承諾で admin 権限付与)
export const adminInvites = pgTable("admin_invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  usedBy: uuid("used_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============ venue / event ============

export const venues = pgTable("venues", {
  id: uuid("id").defaultRandom().primaryKey(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  capacity: integer("capacity"),
  openFrom: text("open_from"), // "HH:mm"、null は終日
  openTo: text("open_to"),
  sortOrder: integer("sort_order").default(0).notNull(),
  showInSchedule: boolean("show_in_schedule").default(true).notNull(), // 予定表にデフォルト表示するか
});

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  venueId: uuid("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  allDay: boolean("all_day").default(false).notNull(), // 期間指定の終日利用
  hostId: uuid("host_id")
    .notNull()
    .references(() => users.id),
  inviteAll: boolean("invite_all").default(true).notNull(),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const eventParticipants = pgTable(
  "event_participants",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: participantStatus("status").default("invited").notNull(),
    remindOptOut: boolean("remind_opt_out").default(false).notNull(), // リマインドはデフォルトオン
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.userId] })],
);

// ============ expense (費用) ============

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  // 全員割り勘: eventId は null / 個別割り勘: eventId 必須(アプリ層で強制)
  eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  amount: integer("amount").notNull(), // 円
  paidBy: uuid("paid_by")
    .notNull()
    .references(() => users.id),
  splitAll: boolean("split_all").default(false).notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const expenseShares = pgTable(
  "expense_shares",
  {
    expenseId: uuid("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(), // 円(端数調整済み)
    // 全員割り勘は作成時に approved で計上
    status: shareStatus("status").default("pending").notNull(),
    resolvedBy: uuid("resolved_by").references(() => users.id), // forced/excluded の操作者
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    nudgedAt: timestamp("nudged_at", { withTimezone: true }), // 24h催促の送信済み時刻
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.expenseId, t.userId] })],
);

// 締め後に生成される精算リスト(送金回数最少)
export const settlements = pgTable("settlements", {
  id: uuid("id").defaultRandom().primaryKey(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  fromUserId: uuid("from_user_id")
    .notNull()
    .references(() => users.id),
  toUserId: uuid("to_user_id")
    .notNull()
    .references(() => users.id),
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============ items (持ち物リスト) ============

export const items = pgTable("items", {
  id: uuid("id").defaultRandom().primaryKey(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }), // null = 全体
  name: text("name").notNull(),
  note: text("note"), // 数量・補足
  addedBy: uuid("added_by")
    .notNull()
    .references(() => users.id),
  // assignee なし = 足りない / あり = 調達予定 / done = 準備OK
  assigneeId: uuid("assignee_id").references(() => users.id),
  method: itemMethod("method"), // bring(持参) / buy(買い出し)
  done: boolean("done").default(false).notNull(),
  expenseId: uuid("expense_id").references(() => expenses.id, { onDelete: "set null" }), // 購入分の費用連携
  sortOrder: integer("sort_order").default(0).notNull(), // 優先度(小さいほど上・ドラッグで並び替え)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============ notifications (お知らせ) ============

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }), // 受信者
  type: notificationType("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"), // アプリ内遷移先
  senderId: uuid("sender_id").references(() => users.id),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
