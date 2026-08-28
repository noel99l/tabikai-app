-- 会場のプライバシー保護設定(予約者を表示しない)。2026-08-28 適用済み
ALTER TABLE venues ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;
