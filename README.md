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
