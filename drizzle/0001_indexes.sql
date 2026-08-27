-- ホットパス用インデックス(2026-08-27 適用済み)
-- drizzle-kit push はテザリング環境(5432遮断)で使えないため、raw SQLで管理する
CREATE INDEX IF NOT EXISTS events_trip_starts_idx ON events (trip_id, starts_at);
CREATE INDEX IF NOT EXISTS event_participants_user_idx ON event_participants (user_id);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications (trip_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS items_trip_sort_idx ON items (trip_id, sort_order);
CREATE INDEX IF NOT EXISTS expenses_trip_created_idx ON expenses (trip_id, created_at DESC);
CREATE INDEX IF NOT EXISTS expense_shares_user_status_idx ON expense_shares (user_id, status);
CREATE INDEX IF NOT EXISTS venues_trip_sort_idx ON venues (trip_id, sort_order);
CREATE INDEX IF NOT EXISTS trip_members_user_idx ON trip_members (user_id);
