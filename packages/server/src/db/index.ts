import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

export function initDb(dbPath?: string): Database.Database {
  const resolvedPath = dbPath ?? join(process.cwd(), 'cam-data.db');

  db = new Database(resolvedPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000');

  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  // Add correlation columns to events table (safe for existing DBs)
  try {
    db.exec(`ALTER TABLE events ADD COLUMN correlation_id TEXT`);
  } catch { /* column already exists */ }
  try {
    db.exec(`ALTER TABLE events ADD COLUMN causation_id TEXT`);
  } catch { /* column already exists */ }

  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
  }
}
