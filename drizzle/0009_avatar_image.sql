-- ユーザーが選ぶアイコン画像(端末で128px正方形にリサイズした data URL)。絵文字より優先して表示する。2026-09-18 適用済み
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_image text;
