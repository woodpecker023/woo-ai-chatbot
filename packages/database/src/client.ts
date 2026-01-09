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
    client = postgres(url);
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
