-- 精算リストの受け取り確認(受け取り側がチェック)。2026-09-22 適用済み
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS received_at timestamptz;
