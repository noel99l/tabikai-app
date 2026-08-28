-- 機能ごとのプッシュ通知設定(トリップ単位・管理者が変更)。2026-08-28 適用済み
ALTER TABLE trips ADD COLUMN IF NOT EXISTS notify_settings jsonb NOT NULL DEFAULT '{}';
-- 通知タイプの細分化(メンバー申請系・イベント変更系を announce から分離)
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'member_request';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'event_update';
