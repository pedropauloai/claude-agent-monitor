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

  // Sprint 11: Add prd_subsection column to prd_tasks table
  try {
    db.exec(`ALTER TABLE prd_tasks ADD COLUMN prd_subsection TEXT`);
  } catch { /* column already exists */ }

  // Sprint 11: Retrofit existing prd_section values that contain " > "
  // Split "Sprint X - Name > Subsection" into prd_section="Sprint X - Name", prd_subsection="Subsection"
  try {
    db.exec(`
      UPDATE prd_tasks
      SET prd_subsection = TRIM(SUBSTR(prd_section, INSTR(prd_section, ' > ') + 3)),
          prd_section = TRIM(SUBSTR(prd_section, 1, INSTR(prd_section, ' > ') - 1))
      WHERE prd_section LIKE '% > %' AND (prd_subsection IS NULL OR prd_subsection = '')
    `);
  } catch { /* migration already applied or no matching rows */ }

  // Sprint 8: Ensure project_registry table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS project_registry (
      working_directory TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      registered_at TEXT NOT NULL DEFAULT (datetime('now')),
      prd_path TEXT,
      hooks_installed INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_project_registry_project ON project_registry(project_id);
  `);

  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
  }
}
