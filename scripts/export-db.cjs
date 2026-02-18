#!/usr/bin/env node

/**
 * CAM Database Export
 *
 * Exports all database tables to a JSON file for backup or migration.
 *
 * USAGE:
 *   node scripts/export-db.cjs                        # Export to cam-export-{date}.json
 *   node scripts/export-db.cjs --output backup.json   # Custom output file
 *   node scripts/export-db.cjs --tables projects,sprints,prd_tasks  # Only specific tables
 *   node scripts/export-db.cjs --pretty               # Indented JSON output
 */

const path = require("path");
const fs = require("fs");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ALL_TABLES = [
  "projects",
  "sprints",
  "prd_tasks",
  "sessions",
  "agents",
  "events",
  "project_registry",
  "session_project_bindings",
  "agent_task_bindings",
  "correlation_audit_log",
  "file_changes",
  "task_items",
  "task_activities",
  "prd_documents",
  "session_groups",
  "session_group_members",
];

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    output: null,
    tables: null,
    pretty: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--output":
        if (i + 1 >= args.length) {
          console.error("Error: --output requires a file path argument.");
          process.exit(1);
        }
        options.output = args[++i];
        break;
      case "--tables":
        if (i + 1 >= args.length) {
          console.error("Error: --tables requires a comma-separated list of table names.");
          process.exit(1);
        }
        options.tables = args[++i].split(",").map((t) => t.trim());
        break;
      case "--pretty":
        options.pretty = true;
        break;
      case "--help":
      case "-h":
        console.log(`
CAM Database Export

USAGE:
  node scripts/export-db.cjs                                        # Export all tables
  node scripts/export-db.cjs --output backup.json                   # Custom output file
  node scripts/export-db.cjs --tables projects,sprints,prd_tasks    # Only specific tables
  node scripts/export-db.cjs --pretty                               # Indented JSON output

OPTIONS:
  --output <path>        Custom output file path (default: cam-export-{date}.json)
  --tables <list>        Comma-separated list of tables to export
  --pretty               Pretty-print JSON with 2-space indentation
  --help, -h             Show this help message

AVAILABLE TABLES:
  ${ALL_TABLES.join(", ")}
        `.trim());
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${args[i]}`);
        console.error('Run with --help for usage information.');
        process.exit(1);
    }
  }

  return options;
}

// ---------------------------------------------------------------------------
// Database resolution
// ---------------------------------------------------------------------------

function resolveDbPath() {
  const candidates = [
    path.join(process.cwd(), "cam-data.db"),
    path.join(process.cwd(), "packages", "server", "cam-data.db"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  console.error("Error: Could not find cam-data.db");
  console.error("Searched in:");
  candidates.forEach((c) => console.error(`  - ${c}`));
  console.error("\nMake sure you run this script from the project root or that the database exists.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Export logic
// ---------------------------------------------------------------------------

function exportDatabase(options) {
  const dbPath = resolveDbPath();
  console.log(`Database found: ${dbPath}`);

  // Load better-sqlite3 from server package
  const betterSqlitePath = path.join(__dirname, "..", "packages", "server", "node_modules", "better-sqlite3");
  let Database;
  try {
    Database = require(betterSqlitePath);
  } catch (err) {
    console.error(`Error: Could not load better-sqlite3 from ${betterSqlitePath}`);
    console.error("Make sure dependencies are installed: pnpm install");
    process.exit(1);
  }

  // Open database in read-only mode
  const db = new Database(dbPath, { readonly: true });
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Determine which tables to export
  const tablesToExport = options.tables || ALL_TABLES;

  // Validate table names
  const invalidTables = tablesToExport.filter((t) => !ALL_TABLES.includes(t));
  if (invalidTables.length > 0) {
    console.error(`Error: Unknown table(s): ${invalidTables.join(", ")}`);
    console.error(`Available tables: ${ALL_TABLES.join(", ")}`);
    db.close();
    process.exit(1);
  }

  console.log(`\nExporting ${tablesToExport.length} table(s)...\n`);

  // Build export data
  const exportData = {
    exportedAt: new Date().toISOString(),
    version: "1.0.0",
    tables: {},
  };

  let totalRows = 0;

  for (const table of tablesToExport) {
    try {
      const rows = db.prepare(`SELECT * FROM "${table}"`).all();
      exportData.tables[table] = {
        count: rows.length,
        rows: rows,
      };
      totalRows += rows.length;
      const countStr = String(rows.length).padStart(6, " ");
      console.log(`  ${countStr} rows  ${table}`);
    } catch (err) {
      // Table might not exist in older databases
      console.log(`       0 rows  ${table} (skipped: ${err.message})`);
      exportData.tables[table] = {
        count: 0,
        rows: [],
      };
    }
  }

  db.close();

  // Determine output path
  const today = new Date().toISOString().slice(0, 10);
  const outputPath = options.output
    ? path.resolve(options.output)
    : path.join(process.cwd(), `cam-export-${today}.json`);

  // Serialize and write
  const jsonContent = options.pretty
    ? JSON.stringify(exportData, null, 2)
    : JSON.stringify(exportData);

  fs.writeFileSync(outputPath, jsonContent, "utf-8");

  // File size
  const stats = fs.statSync(outputPath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  const fileSizeKB = (stats.size / 1024).toFixed(1);
  const sizeLabel = stats.size >= 1024 * 1024 ? `${fileSizeMB} MB` : `${fileSizeKB} KB`;

  // Summary
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Export complete!`);
  console.log(`${"=".repeat(50)}`);
  console.log(`  File:        ${outputPath}`);
  console.log(`  Size:        ${sizeLabel}`);
  console.log(`  Tables:      ${tablesToExport.length}`);
  console.log(`  Total rows:  ${totalRows}`);
  console.log(`  Format:      ${options.pretty ? "pretty (indented)" : "compact"}`);
  console.log(`${"=".repeat(50)}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const options = parseArgs(process.argv);
exportDatabase(options);
