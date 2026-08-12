import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

// DATABASE_URL があれば Postgres(Neon 等)、なければローカル埋め込みの PGlite。
// Neon 移行時は .env に DATABASE_URL を設定するだけでよい。
// (PGlite の drizzle も構造的に互換なので PostgresJsDatabase の型に寄せる)
export type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __db?: Promise<Db> };

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    // IPv6が塞がれたネットワークでの接続タイムアウト対策
    const { setDefaultResultOrder } = await import("node:dns");
    setDefaultResultOrder("ipv4first");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { default: postgres } = await import("postgres");
    // Neon の pooled 接続(pgbouncer)では prepared statements を無効にする
    const client = postgres(url, { max: 5, prepare: false });
    return drizzle(client, { schema }) as unknown as Db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const client = new PGlite("./.pglite/data");
  return drizzle(client, { schema }) as unknown as Db;
}

export function getDb(): Promise<Db> {
  // dev の HMR や serverless での再利用に備えて globalThis に共有
  globalForDb.__db ??= createDb();
  return globalForDb.__db;
}

export { schema };
