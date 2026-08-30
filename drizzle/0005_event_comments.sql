-- イベントのコメント欄(イベント詳細に埋め込み)。2026-08-30 適用済み
CREATE TABLE IF NOT EXISTS event_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_comments_event_idx ON event_comments (event_id, created_at);
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'event_comment';
