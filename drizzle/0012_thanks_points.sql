-- ありがとうポイント: メンバー間でメッセージつきのポイントを送る。手持ちは trips.thanks_budget(標準10)。2026-09-19 適用済み
ALTER TABLE trips ADD COLUMN IF NOT EXISTS thanks_budget integer NOT NULL DEFAULT 10;
CREATE TABLE IF NOT EXISTS thanks_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points integer NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS thanks_points_trip_to_idx ON thanks_points (trip_id, to_user_id);
CREATE INDEX IF NOT EXISTS thanks_points_trip_from_idx ON thanks_points (trip_id, from_user_id);
