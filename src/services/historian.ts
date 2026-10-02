import { Pool } from "pg";

const globalForPostgres = globalThis as typeof globalThis & { bmsHistorianPool?: Pool };

export function getHistorianPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não configurada.");

  if (!globalForPostgres.bmsHistorianPool) {
    globalForPostgres.bmsHistorianPool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 30_000 });
  }
  return globalForPostgres.bmsHistorianPool;
}