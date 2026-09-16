-- 費用の領収書画像(端末側で圧縮したJPEGをbyteaで保存)。2026-09-16 適用済み
CREATE TABLE IF NOT EXISTS expense_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  mime text NOT NULL,
  bytes bytea NOT NULL,
  size integer NOT NULL,
  width integer,
  height integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS expense_receipts_expense_idx ON expense_receipts (expense_id);
