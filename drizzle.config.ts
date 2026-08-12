import { defineConfig } from "drizzle-kit";

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
