-- ありがとうポイント: コメントを任意に、匿名送付を追加。2026-09-19 適用済み
ALTER TABLE thanks_points ALTER COLUMN message SET DEFAULT '';
ALTER TABLE thanks_points ADD COLUMN IF NOT EXISTS anonymous boolean NOT NULL DEFAULT false;
