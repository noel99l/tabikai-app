-- イベントの参加〆切(null=〆切なし)。〆切後は参加登録・参加取り消し不可。2026-08-30 適用済み
ALTER TABLE events ADD COLUMN IF NOT EXISTS signup_deadline timestamptz;
