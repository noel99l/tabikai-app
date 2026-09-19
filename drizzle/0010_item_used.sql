-- 備品を「使い終わった・消費した」として準備OK一覧から非表示にするための時刻。null=未使用。2026-09-19 適用済み
ALTER TABLE items ADD COLUMN IF NOT EXISTS used_at timestamptz;
