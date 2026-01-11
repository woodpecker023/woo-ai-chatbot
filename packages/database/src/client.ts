import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

export type DbClient = PostgresJsDatabase<typeof schema>;

let client: ReturnType<typeof postgres> | null = null;
let db: DbClient | null = null;

export function getDbClient(connectionString?: string): DbClient {
  if (!client) {
    const url = connectionString || process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is not set');
    }

    // Supabase pooler (Supavisor) uses transaction mode which requires:
    // - prepare: false (no prepared statements in transaction mode)
    // - max: limit connections to avoid circuit breaker errors
    // - idle_timeout: release idle connections back to pool
    const isSupabasePooler = url.includes('pooler.supabase.com');

    client = postgres(url, {
      prepare: isSupabasePooler ? false : true,
      max: isSupabasePooler ? 10 : 20,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    db = drizzle(client, { schema });
  }
  return db!;
}

export async function closeDbClient() {
  if (client) {
    await client.end();
    client = null;
    db = null;
  }
}
