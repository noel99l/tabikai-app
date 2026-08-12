import { setDefaultResultOrder } from "node:dns";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// IPv6が塞がれたネットワークでNeonへの接続がタイムアウトするのを防ぐ
setDefaultResultOrder("ipv4first");
config({ path: ".env.local" });
config();

const url = process.env.DATABASE_URL;

// DATABASE_URL 未設定時はローカルの PGlite(.pglite/data)に対して push する
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  ...(url
    ? { dbCredentials: { url } }
    : { driver: "pglite", dbCredentials: { url: "./.pglite/data" } }),
});
