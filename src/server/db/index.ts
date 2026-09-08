// Load local environment variables from .env (if present) before reading DATABASE_URL.
// Existing environment variables take precedence; missing .env is fine on managed runtimes.
try {
  process.loadEnvFile();
} catch {
  // .env not found or not supported — rely on ambient environment variables.
}

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create drizzle instance
export const db = drizzle(pool, { schema });

// Export schema for use in queries
export * from './schema.js';

// Helper to generate UUIDs
export function generateId(): string {
  return crypto.randomUUID();
}

// Helper to format dates
export function now(): Date {
  return new Date();
}

// Health check
export async function healthCheck(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

// Close pool on shutdown
export async function closePool(): Promise<void> {
  await pool.end();
}

// Export connection for transactions
export { pool };