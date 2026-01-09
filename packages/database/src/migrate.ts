import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root .env
dotenv.config({ path: resolve(__dirname, '../../../.env') });

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  console.log('🔄 Running migrations...');

  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);

  try {
    // Enable pgvector extension
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
    console.log('✅ pgvector extension enabled');

    // Run migrations
    await migrate(db, { migrationsFolder: resolve(__dirname, '../migrations') });
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigrations();
