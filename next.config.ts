import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite(WASM)はバンドルせずNode側でそのまま読み込む
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
