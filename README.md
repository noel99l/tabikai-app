# tabikai-app

団体旅行企画「突然の旅会2026」用アプリ(参加者20〜25名向け)。
Next.js + PWA(Webプッシュ通知)で構築。

## 構成

- [docs/requirements.md](docs/requirements.md) — 要件定義(v0.6 仕様確定)
- [mock/tabikai2026-mock.html](mock/tabikai2026-mock.html) — UIモック(ブラウザで直接開けます)
- `src/` — Next.js アプリ本体

## 技術スタック

| 領域 | 採用技術 |
|------|---------|
| フレームワーク | Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 |
| DB | PostgreSQL — 本番: Neon / ローカル: PGlite(埋め込み、設定不要) |
| ORM | Drizzle ORM |
| 認証 | Auth.js (next-auth v5) + Google OAuth(未設定時は開発用ログイン) |
| 通知 | Web Push (VAPID) + Service Worker、PWA(ホーム画面追加) |
| ホスティング | Vercel(予定) |

## URL一覧

### 認証・企画選択

| URL | 機能 |
|-----|------|
| `/login` | ログイン(Google OAuth。開発環境では開発用ログインも表示) |
| `/trips` | イベント(企画)選択。管理者は削除導線あり。ログアウトリンクあり |
| `/trips/new` | 企画の新規作成(作成者が管理者に。会場も一括登録) |
| `/trips/pending` | 参加承認待ちの案内 |
| `/trips/[tripId]/delete` | 企画の削除確認(管理者のみ・全データをカスケード削除) |
| `/join/[tripId]` | **招待リンク**。ログイン→参加リクエスト→管理者承認待ちへ |

### メイン(下部タブ)

| URL | 機能 |
|-----|------|
| `/` | ダッシュボード(イベントロゴ・次の予定・未承認のコスト・承認待ちアラート) |
| `/schedule` | 予定表(列=会場×行=時間帯のグリッド。`?day=N`で日付切替) |
| `/items` | 持ち物リスト(足りない/調達予定/準備OK、持っていく/買ってくる) |
| `/expenses` | 費用一覧(合計・自分の負担・承認状況・精算表示) |
| `/approvals` | 費用承認(自分の承認待ち+24h未承認への主催者/管理者操作) |

### 作成・詳細・その他

| URL | 機能 |
|-----|------|
| `/schedule/new` | イベント作成(会場×日時、重複チェック、全員/個別招待) |
| `/events/[id]` | イベント詳細(参加登録・リマインドのオン/オフ・主催者による参加者追加・削除) |
| `/items/new` | 持ち物の追加(品名・数量・関連イベント) |
| `/expenses/new` | 費用の追加(全員割り勘 or 個別割り勘+イベント紐付け必須) |
| `/notifications` | お知らせ一覧+全体アナウンス送信(ヘッダーのベルから) |
| `/manage` | 管理者コンソール(会場・旅程・メンバー・アナウンスへのハブ。管理者のみ) |
| `/manage/venues` | 会場(部屋)管理(追加・削除。予定表の列になる。管理者のみ) |
| `/manage/trip` | 旅程・企画設定(開始/終了日時・企画名。管理者のみ) |
| `/manage/members` | メンバー管理(参加承認/拒否・招待リンク表示。管理者のみ) |
| `/settings` | アカウント(ユーザー情報・企画切替・**ログアウト**。ヘッダーのアバターから) |
| `/api/auth/*` | Auth.js(Google OAuthコールバック等) |

## 開発の始め方

```bash
npm install
cp .env.example .env.local   # AUTH_SECRET を設定(npx auth secret で生成可)
npm run db:push              # スキーマをDBへ反映(DATABASE_URL未設定ならPGlite)
npm run dev                  # http://localhost:3000
```

- `DATABASE_URL` 未設定の間はローカル埋め込みPostgres(PGlite、`./.pglite/`)で動作
- Neon 作成後は `.env.local` に接続文字列を設定するだけで切り替わる
- Google OAuth 未設定の間は `/login` に開発用ログイン(名前+メール)が表示される

## デプロイ(後で実施)

1. **Neon**: プロジェクト作成 → pooled接続文字列を `DATABASE_URL` に設定 → `npm run db:push`
2. **Google OAuth**: Google Cloud Console でOAuthクライアント作成(リダイレクトURI: `https://<domain>/api/auth/callback/google`)
3. **VAPIDキー**: `npx web-push generate-vapid-keys`
4. **Vercel**: リポジトリを接続し、上記の環境変数を設定

## 実装フェーズ

- [x] フェーズ1: 雛形 — スキーマ / 認証基盤 / PWA基盤 / 全画面UI(サンプルデータ)
- [ ] フェーズ2: DB接続 — 参加承認フロー、イベントCRUD、費用・承認、持ち物リスト
- [ ] フェーズ3: 通知 — Webプッシュ購読、リマインド(5分前)、24h催促、アナウンス
- [ ] フェーズ4: 管理者画面(PC) — 日程/ロゴ/会場/精算締め/管理者招待
- [ ] フェーズ5: Vercel + Neon 本番デプロイ
