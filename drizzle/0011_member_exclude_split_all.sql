-- 「全員で割り勘」の対象から外すメンバー(管理者がメンバー管理で設定)。既存行は含める。2026-09-19 適用済み
ALTER TABLE trip_members ADD COLUMN IF NOT EXISTS exclude_from_split_all boolean NOT NULL DEFAULT false;
