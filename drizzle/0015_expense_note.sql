-- 費用のメモ(任意)。2026-09-22 適用済み
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS note text;
