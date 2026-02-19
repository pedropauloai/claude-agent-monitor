#!/usr/bin/env node

/**
 * CAM Sprint Markdown Importer
 *
 * Parses a sprint markdown file and imports tasks directly into the database.
 * Works without the server running (direct SQLite access).
 *
 * USAGE:
 *   node scripts/import-sprint.cjs docs/SPRINTS/sprint-12.md --project <project-id>
 *   node scripts/import-sprint.cjs sprint.md --project <id> --dry-run
 *
 * SPRINT FORMAT:
 *   See docs/SPRINTS/TEMPLATE.md for the expected markdown format.
 */

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DB_NAME = "cam-data.db";
const SCHEMA_RELATIVE_PATH = "packages/server/src/db/schema.sql";

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    file: null,
    projectId: null,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--project":
        if (i + 1 >= args.length) {
          console.error("Error: --project requires a project ID argument.");
          process.exit(1);
        }
        options.projectId = args[++i];
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      default:
        if (args[i].startsWith("--")) {
          console.error(`Unknown flag: ${args[i]}`);
          console.error('Run with --help for usage information.');
          process.exit(1);
        }
        // Positional argument = file path
        if (!options.file) {
          options.file = args[i];
        } else {
          console.error(`Unexpected argument: ${args[i]}`);
          process.exit(1);
        }
        break;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
CAM Sprint Markdown Importer

USAGE:
  node scripts/import-sprint.cjs <sprint-file.md> --project <project-id>
  node scripts/import-sprint.cjs <sprint-file.md> --project <id> --dry-run

ARGUMENTS:
  <sprint-file.md>       Path to the sprint markdown file (required)

OPTIONS:
  --project <id>         Project ID to associate tasks with (required)
  --dry-run              Show what would be imported without writing to DB
  --help, -h             Show this help message

EXAMPLES:
  node scripts/import-sprint.cjs docs/SPRINTS/sprint-12.md --project b9f55006-...
  node scripts/import-sprint.cjs sprint.md --project my-project-id --dry-run
  `.trim());
}

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

function resolveDbPath() {
  const candidates = [
    path.join(process.cwd(), DB_NAME),
    path.join(process.cwd(), "packages", "server", DB_NAME),
  ];

  // Also check relative to script location
  const scriptDir = path.dirname(__filename);
  const projectRoot = path.resolve(scriptDir, "..");
  candidates.push(path.join(projectRoot, DB_NAME));
  candidates.push(path.join(projectRoot, "packages", "server", DB_NAME));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  console.error(`Error: Database file "${DB_NAME}" not found.`);
  console.error("Searched in:");
  candidates.forEach((c) => console.error(`  - ${c}`));
  console.error("\nMake sure you run this script from the project root or that the database exists.");
  process.exit(1);
}

function resolveSchemaPath() {
  const candidates = [
    path.resolve(process.cwd(), SCHEMA_RELATIVE_PATH),
    path.resolve(path.dirname(__filename), "..", SCHEMA_RELATIVE_PATH),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  console.error(`Error: Schema file not found at "${SCHEMA_RELATIVE_PATH}".`);
  console.error("Searched in:");
  candidates.forEach((c) => console.error(`  - ${c}`));
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Sprint Markdown Parser
// ---------------------------------------------------------------------------

/**
 * Parses a sprint markdown file into a structured object.
 *
 * Expected format:
 *   # Sprint X - Name
 *   Status: planned | active | completed
 *   ---
 *   ## Context (ignored)
 *   ---
 *   ## Tasks
 *   ### Section Name
 *   - [ ] Task title
 *     Priority: high
 *     Tags: tag1, tag2
 *     Description: What needs to be done.
 *     Files: path/to/file.ts
 */
function parseSprintMarkdown(content) {
  const lines = content.split(/\r?\n/);

  /** @type {{ name: string, status: string, tasks: Array<{title: string, status: string, priority: string, tags: string, description: string, files: string, section: string}> }} */
  const sprint = {
    name: "",
    status: "planned",
    tasks: [],
  };

  let inTasksSection = false;
  let currentSection = "";
  let currentTask = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // --- Sprint name: # Sprint X - Name ---
    if (!sprint.name && /^# .+/.test(trimmed)) {
      sprint.name = trimmed.replace(/^# /, "").trim();
      continue;
    }

    // --- Sprint status: Status: xxx ---
    if (/^Status:\s*/i.test(trimmed)) {
      const statusValue = trimmed.replace(/^Status:\s*/i, "").trim().toLowerCase();
      if (["planned", "active", "completed"].includes(statusValue)) {
        sprint.status = statusValue;
      }
      continue;
    }

    // --- Detect ## Tasks section ---
    if (/^## Tasks\s*$/i.test(trimmed)) {
      inTasksSection = true;
      continue;
    }

    // --- Stop parsing tasks on next ## that is not Tasks ---
    if (inTasksSection && /^## /.test(trimmed) && !/^## Tasks\s*$/i.test(trimmed)) {
      // Save any pending task
      if (currentTask) {
        sprint.tasks.push(currentTask);
        currentTask = null;
      }
      inTasksSection = false;
      continue;
    }

    // --- Stop parsing tasks on horizontal rule after tasks ---
    if (inTasksSection && /^---\s*$/.test(trimmed)) {
      if (currentTask) {
        sprint.tasks.push(currentTask);
        currentTask = null;
      }
      inTasksSection = false;
      continue;
    }

    if (!inTasksSection) {
      continue;
    }

    // --- Section heading: ### Section Name ---
    if (/^### .+/.test(trimmed)) {
      // Save any pending task before switching sections
      if (currentTask) {
        sprint.tasks.push(currentTask);
        currentTask = null;
      }
      currentSection = trimmed.replace(/^### /, "").trim();
      continue;
    }

    // --- Task line: - [ ] Title or - [x] Title ---
    const taskMatch = trimmed.match(/^- \[([ x])\] (.+)$/);
    if (taskMatch) {
      // Save previous task if exists
      if (currentTask) {
        sprint.tasks.push(currentTask);
      }

      const isCompleted = taskMatch[1] === "x";
      const title = taskMatch[2].trim();

      currentTask = {
        title,
        status: isCompleted ? "completed" : "planned",
        priority: "medium",
        tags: "",
        description: "",
        files: "",
        section: currentSection,
      };
      continue;
    }

    // --- Metadata lines (indented under a task) ---
    if (currentTask && /^\s+/.test(line)) {
      const metaLine = trimmed;

      const priorityMatch = metaLine.match(/^Priority:\s*(.+)$/i);
      if (priorityMatch) {
        const prio = priorityMatch[1].trim().toLowerCase();
        if (["critical", "high", "medium", "low"].includes(prio)) {
          currentTask.priority = prio;
        }
        continue;
      }

      const tagsMatch = metaLine.match(/^Tags:\s*(.+)$/i);
      if (tagsMatch) {
        currentTask.tags = tagsMatch[1].trim();
        continue;
      }

      const descMatch = metaLine.match(/^Description:\s*(.+)$/i);
      if (descMatch) {
        currentTask.description = descMatch[1].trim();
        continue;
      }

      const filesMatch = metaLine.match(/^Files:\s*(.+)$/i);
      if (filesMatch) {
        currentTask.files = filesMatch[1].trim();
        continue;
      }
    }
  }

  // Save last task if pending
  if (currentTask) {
    sprint.tasks.push(currentTask);
  }

  return sprint;
}

// ---------------------------------------------------------------------------
// Database operations
// ---------------------------------------------------------------------------

function openDatabase(dbPath, schemaPath, readOnly) {
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
      console.error("Error: Could not load better-sqlite3.");
      console.error("Run: pnpm --filter @claudecam/server install");
      process.exit(1);
    }
  }

  const db = new Database(dbPath, readOnly ? { readonly: true } : undefined);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Ensure tables exist by running schema.sql
  if (!readOnly) {
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");
    db.exec(schemaSql);
  }

  return db;
}

function validateProject(db, projectId) {
  const project = db.prepare("SELECT id, name FROM projects WHERE id = ?").get(projectId);
  if (!project) {
    console.error(`Error: Project with ID "${projectId}" not found in the database.`);
    console.error("\nAvailable projects:");
    const projects = db.prepare("SELECT id, name FROM projects ORDER BY name").all();
    if (projects.length === 0) {
      console.error("  (no projects found)");
    } else {
      projects.forEach((p) => {
        console.error(`  ${p.id}  ${p.name}`);
      });
    }
    db.close();
    process.exit(1);
  }
  return project;
}

function findOrCreateSprint(db, projectId, sprintData, dryRun) {
  // Check if sprint already exists by name + project_id
  const existing = db
    .prepare("SELECT id, total_tasks, completed_tasks FROM sprints WHERE name = ? AND project_id = ?")
    .get(sprintData.name, projectId);

  if (existing) {
    console.log(`  Sprint found: "${sprintData.name}" (id: ${existing.id})`);
    // Update status if different
    if (!dryRun) {
      db.prepare("UPDATE sprints SET status = ? WHERE id = ?").run(sprintData.status, existing.id);
    }
    return { id: existing.id, isNew: false };
  }

  // Determine the next order value
  const lastOrder = db
    .prepare('SELECT MAX("order") as maxOrder FROM sprints WHERE project_id = ?')
    .get(projectId);
  const nextOrder = (lastOrder && lastOrder.maxOrder != null) ? lastOrder.maxOrder + 1 : 1;

  const sprintId = crypto.randomUUID();

  if (!dryRun) {
    db.prepare(
      `INSERT INTO sprints (id, project_id, name, status, "order", total_tasks, completed_tasks)
       VALUES (?, ?, ?, ?, ?, 0, 0)`
    ).run(sprintId, projectId, sprintData.name, sprintData.status, nextOrder);
  }

  console.log(`  Sprint created: "${sprintData.name}" (id: ${sprintId}, order: ${nextOrder})`);
  return { id: sprintId, isNew: true };
}

function importTasks(db, projectId, sprintId, tasks, dryRun) {
  let imported = 0;
  let skipped = 0;

  // Prepare statements
  const checkExisting = db.prepare(
    "SELECT id FROM prd_tasks WHERE title = ? AND sprint_id = ?"
  );
  const insertTask = db.prepare(
    `INSERT INTO prd_tasks (id, project_id, sprint_id, title, description, status, priority, tags, prd_section, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  );

  for (const task of tasks) {
    // Check for duplicate by title + sprint_id
    const existing = checkExisting.get(task.title, sprintId);
    if (existing) {
      console.log(`  SKIP  ${task.title}`);
      console.log(`        (already exists: ${existing.id})`);
      skipped++;
      continue;
    }

    const taskId = crypto.randomUUID();
    const statusIcon = task.status === "completed" ? "[x]" : "[ ]";

    if (!dryRun) {
      insertTask.run(
        taskId,
        projectId,
        sprintId,
        task.title,
        task.description,
        task.status,
        task.priority,
        task.tags,
        task.section || null
      );
    }

    const priorityLabel = task.priority !== "medium" ? ` (${task.priority})` : "";
    const sectionLabel = task.section ? ` [${task.section}]` : "";
    console.log(`  ${statusIcon} ${task.title}${priorityLabel}${sectionLabel}`);
    imported++;
  }

  return { imported, skipped };
}

function updateCounters(db, sprintId, projectId) {
  // Update sprint counters
  const sprintCounts = db
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
       FROM prd_tasks WHERE sprint_id = ?`
    )
    .get(sprintId);

  db.prepare("UPDATE sprints SET total_tasks = ?, completed_tasks = ? WHERE id = ?").run(
    sprintCounts.total,
    sprintCounts.completed,
    sprintId
  );

  // Update project counters
  const projectCounts = db
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
       FROM prd_tasks WHERE project_id = ?`
    )
    .get(projectId);

  db.prepare("UPDATE projects SET total_tasks = ?, completed_tasks = ?, updated_at = datetime('now') WHERE id = ?").run(
    projectCounts.total,
    projectCounts.completed,
    projectId
  );

  return { sprintCounts, projectCounts };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const options = parseArgs(process.argv);

  // Validate required arguments
  if (!options.file) {
    console.error("Error: Sprint markdown file path is required.");
    console.error("Usage: node scripts/import-sprint.cjs <file.md> --project <id>");
    console.error("Run with --help for more information.");
    process.exit(1);
  }

  if (!options.projectId) {
    console.error("Error: --project <id> is required.");
    console.error("Usage: node scripts/import-sprint.cjs <file.md> --project <id>");
    console.error("Run with --help for more information.");
    process.exit(1);
  }

  // Resolve and validate file path
  const filePath = path.resolve(options.file);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("  CAM Sprint Importer");
  console.log("=".repeat(60));
  console.log();

  if (options.dryRun) {
    console.log("  MODE: DRY RUN (no changes will be written to DB)");
    console.log();
  }

  console.log(`  File:    ${filePath}`);
  console.log(`  Project: ${options.projectId}`);
  console.log();

  // ---------------------------------------------------------------------------
  // Step 1: Parse markdown
  // ---------------------------------------------------------------------------

  console.log("Parsing sprint markdown...");
  const content = fs.readFileSync(filePath, "utf-8");
  const sprintData = parseSprintMarkdown(content);

  if (!sprintData.name) {
    console.error("Error: Could not extract sprint name from the markdown file.");
    console.error('Expected a heading like: # Sprint X - Sprint Name');
    process.exit(1);
  }

  if (sprintData.tasks.length === 0) {
    console.error("Error: No tasks found in the markdown file.");
    console.error('Expected tasks under a "## Tasks" section with "- [ ] Task title" format.');
    process.exit(1);
  }

  console.log(`  Sprint:  "${sprintData.name}"`);
  console.log(`  Status:  ${sprintData.status}`);
  console.log(`  Tasks:   ${sprintData.tasks.length} found`);

  // Show sections breakdown
  const sections = [...new Set(sprintData.tasks.map((t) => t.section).filter(Boolean))];
  if (sections.length > 0) {
    console.log(`  Sections:`);
    for (const section of sections) {
      const count = sprintData.tasks.filter((t) => t.section === section).length;
      console.log(`    - ${section} (${count} tasks)`);
    }
  }
  console.log();

  // ---------------------------------------------------------------------------
  // Step 2: Open database
  // ---------------------------------------------------------------------------

  const dbPath = resolveDbPath();
  const schemaPath = resolveSchemaPath();

  console.log(`  DB:      ${dbPath}`);
  console.log(`  Schema:  ${schemaPath}`);
  console.log();

  const db = openDatabase(dbPath, schemaPath, false);

  // Validate project exists
  const project = validateProject(db, options.projectId);
  console.log(`  Project: "${project.name}" (${project.id})`);
  console.log();

  // ---------------------------------------------------------------------------
  // Step 3: Find or create sprint
  // ---------------------------------------------------------------------------

  console.log("Setting up sprint...");
  const { id: sprintId, isNew: isNewSprint } = findOrCreateSprint(db, options.projectId, sprintData, options.dryRun);
  console.log();

  // ---------------------------------------------------------------------------
  // Step 4: Import tasks
  // ---------------------------------------------------------------------------

  console.log("Importing tasks...");
  const { imported, skipped } = importTasks(db, options.projectId, sprintId, sprintData.tasks, options.dryRun);
  console.log();

  // ---------------------------------------------------------------------------
  // Step 5: Update counters
  // ---------------------------------------------------------------------------

  if (!options.dryRun && imported > 0) {
    const { sprintCounts, projectCounts } = updateCounters(db, sprintId, options.projectId);
    console.log("Counters updated:");
    console.log(`  Sprint:  ${sprintCounts.completed}/${sprintCounts.total} completed`);
    console.log(`  Project: ${projectCounts.completed}/${projectCounts.total} completed`);
    console.log();
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  console.log("=".repeat(60));
  console.log("  IMPORT SUMMARY");
  console.log("=".repeat(60));
  console.log(`  Sprint:        ${sprintData.name} (${isNewSprint ? "NEW" : "EXISTING"})`);
  console.log(`  Sprint ID:     ${sprintId}`);
  console.log(`  Status:        ${sprintData.status}`);
  console.log(`  Tasks found:   ${sprintData.tasks.length}`);
  console.log(`  Tasks imported: ${imported}`);
  console.log(`  Tasks skipped: ${skipped} (duplicates)`);

  if (options.dryRun) {
    console.log();
    console.log("  DRY RUN - no changes were written to the database.");
    console.log("  Remove --dry-run to actually import.");
  }

  console.log("=".repeat(60));

  db.close();
}

main();
