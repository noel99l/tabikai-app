-- メンバーごとのプッシュ通知設定(企画のデフォルト=trips.notify_settingsを上書き)。2026-08-30 適用済み
ALTER TABLE trip_members ADD COLUMN IF NOT EXISTS notify_settings jsonb NOT NULL DEFAULT '{}';
