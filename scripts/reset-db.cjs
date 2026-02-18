#!/usr/bin/env node

/**
 * CAM Database Reset
 *
 * Drops all data and recreates tables from schema.sql.
 * Use this for a fresh start during development.
 *
 * USAGE:
 *   node scripts/reset-db.cjs              # Dry run (shows what would be dropped)
 *   node scripts/reset-db.cjs --confirm    # Actually reset the database
 *
 * WARNING: This permanently deletes ALL data. There is no undo.
 */

const path = require("path");
const fs = require("fs");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DB_NAME = "cam-data.db";
const SCHEMA_RELATIVE_PATH = "packages/server/src/db/schema.sql";

// Tables in dependency order (children first, parents last).
// This ensures foreign key constraints are respected during DROP.
const TABLES_DROP_ORDER = [
  "task_activities",
  "correlation_audit_log",
  "agent_task_bindings",
  "session_project_bindings",
  "prd_documents",
  "prd_tasks",
  "sprints",
  "projects",
  "project_registry",
  "file_changes",
  "task_items",
  "events",
  "session_group_members",
  "session_groups",
  "agents",
  "sessions",
];

// ---------------------------------------------------------------------------
// Resolve paths
// ---------------------------------------------------------------------------

function resolveDbPath() {
  // Check cam-data.db in cwd first
  const cwdPath = path.resolve(process.cwd(), DB_NAME);
  if (fs.existsSync(cwdPath)) {
    return cwdPath;
  }

  // Then check packages/server/cam-data.db
  const serverPath = path.resolve(process.cwd(), "packages", "server", DB_NAME);
  if (fs.existsSync(serverPath)) {
    return serverPath;
  }

  // Also check relative to script location (in case cwd differs)
  const scriptDir = path.dirname(__filename);
  const projectRoot = path.resolve(scriptDir, "..");

  const rootPath = path.resolve(projectRoot, DB_NAME);
  if (fs.existsSync(rootPath)) {
    return rootPath;
  }

  const rootServerPath = path.resolve(projectRoot, "packages", "server", DB_NAME);
  if (fs.existsSync(rootServerPath)) {
    return rootServerPath;
  }

  return null;
}

function resolveSchemaPath() {
  // Try from cwd
  const cwdPath = path.resolve(process.cwd(), SCHEMA_RELATIVE_PATH);
  if (fs.existsSync(cwdPath)) {
    return cwdPath;
  }

  // Try from script location
  const scriptDir = path.dirname(__filename);
  const projectRoot = path.resolve(scriptDir, "..");
  const rootPath = path.resolve(projectRoot, SCHEMA_RELATIVE_PATH);
  if (fs.existsSync(rootPath)) {
    return rootPath;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const confirm = process.argv.includes("--confirm");

  console.log("=".repeat(60));
  console.log("  CAM Database Reset");
  console.log("=".repeat(60));
  console.log();

  // Resolve database path
  const dbPath = resolveDbPath();
  if (!dbPath) {
    console.error(`ERROR: Database file "${DB_NAME}" not found.`);
    console.error("Searched in:");
    console.error(`  - ${path.resolve(process.cwd(), DB_NAME)}`);
    console.error(`  - ${path.resolve(process.cwd(), "packages", "server", DB_NAME)}`);
    process.exit(1);
  }
  console.log(`Database: ${dbPath}`);

  // Resolve schema path
  const schemaPath = resolveSchemaPath();
  if (!schemaPath) {
    console.error(`ERROR: Schema file not found at "${SCHEMA_RELATIVE_PATH}".`);
    process.exit(1);
  }
  console.log(`Schema:   ${schemaPath}`);
  console.log();

  // Load better-sqlite3 from server package
  let Database;
  try {
    Database = require("../packages/server/node_modules/better-sqlite3");
  } catch {
    // Fallback: try from script-relative path
    try {
      const scriptDir = path.dirname(__filename);
      const projectRoot = path.resolve(scriptDir, "..");
      Database = require(path.resolve(projectRoot, "packages", "server", "node_modules", "better-sqlite3"));
    } catch {
      console.error("ERROR: Could not load better-sqlite3.");
      console.error("Run: pnpm --filter @cam/server install");
      process.exit(1);
    }
  }

  // Open database
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Collect row counts per table
  console.log("Current table row counts:");
  console.log("-".repeat(45));

  const tableCounts = [];
  let totalRows = 0;

  for (const table of TABLES_DROP_ORDER) {
    try {
      const row = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
      const count = row.count;
      tableCounts.push({ table, count });
      totalRows += count;
      const indicator = count > 0 ? " <--" : "";
      console.log(`  ${table.padEnd(30)} ${String(count).padStart(6)} rows${indicator}`);
    } catch {
      // Table might not exist yet
      tableCounts.push({ table, count: 0 });
      console.log(`  ${table.padEnd(30)}    N/A (table not found)`);
    }
  }

  console.log("-".repeat(45));
  console.log(`  ${"TOTAL".padEnd(30)} ${String(totalRows).padStart(6)} rows`);
  console.log();

  // Dry run mode
  if (!confirm) {
    console.log("MODE: Dry run (no changes made)");
    console.log();
    console.log("This would DROP all 16 tables and recreate them empty.");
    console.log(`${totalRows} total rows would be permanently deleted.`);
    console.log();
    console.log("To execute the reset, run:");
    console.log("  node scripts/reset-db.cjs --confirm");
    console.log();
    db.close();
    process.exit(0);
  }

  // Confirmed - execute reset
  console.log("MODE: CONFIRMED - Resetting database...");
  console.log();

  // Drop all tables
  console.log("Dropping tables...");
  db.pragma("foreign_keys = OFF"); // Disable FK checks during DROP

  for (const table of TABLES_DROP_ORDER) {
    try {
      db.prepare(`DROP TABLE IF EXISTS ${table}`).run();
      const entry = tableCounts.find((t) => t.table === table);
      const count = entry ? entry.count : 0;
      console.log(`  DROP ${table.padEnd(30)} (${count} rows deleted)`);
    } catch (err) {
      console.error(`  ERROR dropping ${table}: ${err.message}`);
    }
  }

  // Also drop any indexes that might remain (SQLite usually drops them with the table,
  // but just in case)
  console.log();

  // Re-enable foreign keys
  db.pragma("foreign_keys = ON");

  // Read and execute schema
  console.log("Recreating tables from schema.sql...");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schemaSql);
  console.log("  Schema applied successfully.");
  console.log();

  // Verify tables were created
  console.log("Verifying recreated tables...");
  const createdTables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all()
    .map((r) => r.name);

  console.log(`  ${createdTables.length} tables created: ${createdTables.join(", ")}`);
  console.log();

  // Summary
  console.log("=".repeat(60));
  console.log("  RESET COMPLETE");
  console.log("=".repeat(60));
  console.log(`  Tables dropped:    ${TABLES_DROP_ORDER.length}`);
  console.log(`  Rows deleted:      ${totalRows}`);
  console.log(`  Tables recreated:  ${createdTables.length}`);
  console.log(`  Database:          ${dbPath}`);
  console.log("=".repeat(60));

  db.close();
}

main();
