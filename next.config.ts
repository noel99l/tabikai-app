import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite(WASM)はバンドルせずNode側でそのまま読み込む
  serverExternalPackages: ["@electric-sql/pglite"],
  experimental: {
    // クライアントのルーターキャッシュ保持時間。
    // 一度表示したページ(や事前取得済みページ)は dynamic でも60秒はキャッシュから
    // 即時表示し、遷移のたびのローディングを避ける。
    // データ変更時は各サーバーアクションの revalidatePath がキャッシュを破棄するため、
    // 自分の操作は即時反映される(他人の変更は最大60秒遅れて見える)。
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
};

export default nextConfig;
