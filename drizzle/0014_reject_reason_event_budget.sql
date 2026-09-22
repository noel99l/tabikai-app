-- 費用の否認メッセージと、イベントの予算の目安(金額+1人あたり/全体)。2026-09-22 適用済み
ALTER TABLE expense_shares ADD COLUMN IF NOT EXISTS reject_reason text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS budget_amount integer;
ALTER TABLE events ADD COLUMN IF NOT EXISTS budget_per text;
