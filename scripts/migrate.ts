/**
 * Database Migration Runner
 *
 * Applies pending Drizzle migrations from the `migrations/` folder using the
 * drizzle-orm migrator API directly. More reliable than the drizzle-kit CLI
 * across Node versions.
 *
 * Run with: npx tsx scripts/migrate.ts
 */

// Load local environment variables from .env (if present).
try {
  process.loadEnvFile();
} catch {
  // .env not found — rely on ambient environment variables.
}

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Create a .env file (see .env.example).');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

try {
  await migrate(db, { migrationsFolder: './migrations' });
  console.log('Migrations applied successfully.');
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  await pool.end();
}