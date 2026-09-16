-- 買物 / 備品のカテゴリ(食材/調理器具/遊び道具/消耗品)。既存行は食材。2026-09-16 適用済み
DO $$ BEGIN
  CREATE TYPE item_category AS ENUM ('food', 'cookware', 'play', 'consumable');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE items ADD COLUMN IF NOT EXISTS category item_category NOT NULL DEFAULT 'food';
