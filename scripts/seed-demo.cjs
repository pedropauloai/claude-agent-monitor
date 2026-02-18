#!/usr/bin/env node

/**
 * CAM Demo Data Seed
 *
 * Populates a demo project with sample sprints, tasks, agents, and events
 * so new users can explore the dashboard without real Claude Code data.
 *
 * USAGE:
 *   node scripts/seed-demo.cjs          # Add demo data
 *   node scripts/seed-demo.cjs --clean  # Remove existing demo data first
 */

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DB_NAME = "cam-data.db";
const SCHEMA_RELATIVE_PATH = "packages/server/src/db/schema.sql";
const DEMO_PROJECT_NAME = "Demo Project - Task Manager App";

// ---------------------------------------------------------------------------
// Path Resolution
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

  // Fallback: create in cwd
  return cwdPath;
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

function loadDatabase() {
  let Database;
  try {
    Database = require("../packages/server/node_modules/better-sqlite3");
  } catch {
    try {
      const scriptDir = path.dirname(__filename);
      const projectRoot = path.resolve(scriptDir, "..");
      Database = require(
        path.resolve(projectRoot, "packages", "server", "node_modules", "better-sqlite3")
      );
    } catch {
      console.error("ERRO: Nao foi possivel carregar better-sqlite3.");
      console.error("Execute: pnpm --filter @cam/server install");
      process.exit(1);
    }
  }
  return Database;
}

// ---------------------------------------------------------------------------
// ID Generator
// ---------------------------------------------------------------------------

function uuid() {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// Timestamp Helpers
// ---------------------------------------------------------------------------

function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function hoursAgo(hours) {
  return minutesAgo(hours * 60);
}

function daysAgo(days) {
  return minutesAgo(days * 24 * 60);
}

// ---------------------------------------------------------------------------
// Demo Data Definitions
// ---------------------------------------------------------------------------

function buildDemoData() {
  const projectId = uuid();
  const sprint1Id = uuid();
  const sprint2Id = uuid();
  const sprint3Id = uuid();
  const sessionId = uuid();

  // Agent IDs (in CAM, agent_id often = session_id for main agent)
  const mainAgentId = sessionId;
  const subAgent1Id = uuid();
  const subAgent2Id = uuid();

  const now = new Date().toISOString();
  const workingDir = process.cwd().replace(/\\/g, "/");

  // --- Sprint 1 Tasks (all completed) ---
  const sprint1Tasks = [
    {
      id: uuid(),
      title: "Set up Express server",
      description: "Initialize Express.js with TypeScript, configure middleware (cors, helmet, compression), set up error handling and graceful shutdown.",
      status: "completed",
      priority: "critical",
      complexity: 3,
      tags: '["backend","setup","express"]',
      prd_subsection: "Server Setup",
    },
    {
      id: uuid(),
      title: "Create SQLite database schema",
      description: "Design and implement SQLite schema with tables for users, tasks, categories, and tags. Use better-sqlite3 with WAL mode.",
      status: "completed",
      priority: "critical",
      complexity: 5,
      tags: '["backend","database","sqlite"]',
      prd_subsection: "Database",
    },
    {
      id: uuid(),
      title: "Implement REST API endpoints",
      description: "Build CRUD endpoints for tasks (/api/tasks), categories (/api/categories), and user preferences. Follow RESTful conventions.",
      status: "completed",
      priority: "high",
      complexity: 5,
      tags: '["backend","api","rest"]',
      prd_subsection: "API",
    },
    {
      id: uuid(),
      title: "Add authentication middleware",
      description: "Implement JWT-based authentication with login/register endpoints. Add auth middleware to protect task endpoints.",
      status: "completed",
      priority: "high",
      complexity: 5,
      tags: '["backend","auth","jwt"]',
      prd_subsection: "Authentication",
    },
    {
      id: uuid(),
      title: "Write API integration tests",
      description: "Create integration tests for all API endpoints using supertest. Cover happy paths, edge cases, and error scenarios.",
      status: "completed",
      priority: "medium",
      complexity: 3,
      tags: '["backend","testing","integration"]',
      prd_subsection: "Testing",
    },
  ];

  // --- Sprint 2 Tasks (mixed statuses) ---
  const sprint2Tasks = [
    {
      id: uuid(),
      title: "Set up React project with Vite",
      description: "Initialize React 19 project with Vite, configure TypeScript, Tailwind CSS, and path aliases. Set up project structure.",
      status: "completed",
      priority: "critical",
      complexity: 3,
      tags: '["frontend","setup","react","vite"]',
      prd_subsection: "Project Setup",
    },
    {
      id: uuid(),
      title: "Build task list component",
      description: "Create TaskList component with filtering, sorting, search, and pagination. Support list and grid view modes.",
      status: "completed",
      priority: "high",
      complexity: 5,
      tags: '["frontend","components","tasks"]',
      prd_subsection: "Components",
    },
    {
      id: uuid(),
      title: "Implement drag-and-drop Kanban",
      description: "Build Kanban board with draggable task cards using dnd-kit. Support column reordering and task status updates on drop.",
      status: "completed",
      priority: "high",
      complexity: 8,
      tags: '["frontend","kanban","dnd"]',
      prd_subsection: "Kanban Board",
    },
    {
      id: uuid(),
      title: "Add real-time updates via SSE",
      description: "Implement Server-Sent Events for real-time task updates. Dashboard should reflect changes from other users without manual refresh.",
      status: "in_progress",
      priority: "high",
      complexity: 5,
      tags: '["frontend","sse","realtime"]',
      prd_subsection: "Real-time",
      assigned_agent: mainAgentId,
    },
    {
      id: uuid(),
      title: "Create settings page",
      description: "Build settings page with tabs for Profile, Appearance (theme/accent color), Notifications, and Data Management.",
      status: "in_progress",
      priority: "medium",
      complexity: 3,
      tags: '["frontend","settings","ui"]',
      prd_subsection: "Settings",
      assigned_agent: subAgent1Id,
    },
    {
      id: uuid(),
      title: "Add dark mode support",
      description: "Implement dark mode toggle with system preference detection. Persist user choice in localStorage. Apply theme to all components.",
      status: "planned",
      priority: "low",
      complexity: 3,
      tags: '["frontend","theme","darkmode"]',
      prd_subsection: "Theme",
    },
  ];

  // --- Sprint 3 Tasks (all planned) ---
  const sprint3Tasks = [
    {
      id: uuid(),
      title: "Optimize database queries",
      description: "Add indexes for frequently queried columns, implement query pagination at DB level, add EXPLAIN ANALYZE for slow queries.",
      status: "planned",
      priority: "high",
      complexity: 5,
      tags: '["backend","performance","database"]',
      prd_subsection: "Performance",
    },
    {
      id: uuid(),
      title: "Add mobile responsive layout",
      description: "Make all views responsive for mobile devices. Implement bottom navigation bar, collapsible sidebar, and touch-friendly interactions.",
      status: "planned",
      priority: "high",
      complexity: 5,
      tags: '["frontend","responsive","mobile"]',
      prd_subsection: "Mobile",
    },
    {
      id: uuid(),
      title: "Write user documentation",
      description: "Create user guide with screenshots, API documentation with OpenAPI spec, and developer setup guide for contributors.",
      status: "planned",
      priority: "medium",
      complexity: 3,
      tags: '["docs","documentation"]',
      prd_subsection: "Documentation",
    },
    {
      id: uuid(),
      title: "Set up CI/CD pipeline",
      description: "Configure GitHub Actions for lint, typecheck, test on PRs. Add automatic deployment to staging on merge to main.",
      status: "planned",
      priority: "medium",
      complexity: 5,
      tags: '["devops","ci","cd","github-actions"]',
      prd_subsection: "DevOps",
    },
  ];

  // --- Demo Events ---
  const demoEvents = [
    {
      id: uuid(),
      agent_id: mainAgentId,
      hook_type: "SessionStart",
      category: "lifecycle",
      tool: null,
      file_path: null,
      input: JSON.stringify({ working_directory: workingDir }),
      output: null,
      error: null,
      duration: null,
      timestamp: minutesAgo(45),
    },
    {
      id: uuid(),
      agent_id: mainAgentId,
      hook_type: "PostToolUse",
      category: "file_operation",
      tool: "Read",
      file_path: "src/components/TaskList.tsx",
      input: JSON.stringify({ file_path: "src/components/TaskList.tsx" }),
      output: JSON.stringify({ lines: 245 }),
      error: null,
      duration: 12,
      timestamp: minutesAgo(42),
    },
    {
      id: uuid(),
      agent_id: mainAgentId,
      hook_type: "PostToolUse",
      category: "file_operation",
      tool: "Read",
      file_path: "src/lib/sse-client.ts",
      input: JSON.stringify({ file_path: "src/lib/sse-client.ts" }),
      output: JSON.stringify({ lines: 89 }),
      error: null,
      duration: 8,
      timestamp: minutesAgo(40),
    },
    {
      id: uuid(),
      agent_id: mainAgentId,
      hook_type: "PostToolUse",
      category: "file_operation",
      tool: "Edit",
      file_path: "src/lib/sse-client.ts",
      input: JSON.stringify({ file_path: "src/lib/sse-client.ts", old_string: "// TODO: reconnect", new_string: "// Auto-reconnect with exponential backoff" }),
      output: JSON.stringify({ success: true }),
      error: null,
      duration: 25,
      timestamp: minutesAgo(38),
    },
    {
      id: uuid(),
      agent_id: mainAgentId,
      hook_type: "PostToolUse",
      category: "file_operation",
      tool: "Write",
      file_path: "src/hooks/use-sse.ts",
      input: JSON.stringify({ file_path: "src/hooks/use-sse.ts" }),
      output: JSON.stringify({ success: true, bytes: 1820 }),
      error: null,
      duration: 15,
      timestamp: minutesAgo(35),
    },
    {
      id: uuid(),
      agent_id: subAgent1Id,
      hook_type: "SessionStart",
      category: "lifecycle",
      tool: null,
      file_path: null,
      input: JSON.stringify({ working_directory: workingDir }),
      output: null,
      error: null,
      duration: null,
      timestamp: minutesAgo(30),
    },
    {
      id: uuid(),
      agent_id: subAgent1Id,
      hook_type: "PostToolUse",
      category: "file_operation",
      tool: "Read",
      file_path: "src/pages/Settings.tsx",
      input: JSON.stringify({ file_path: "src/pages/Settings.tsx" }),
      output: JSON.stringify({ lines: 180 }),
      error: null,
      duration: 10,
      timestamp: minutesAgo(28),
    },
    {
      id: uuid(),
      agent_id: subAgent1Id,
      hook_type: "PostToolUse",
      category: "file_operation",
      tool: "Edit",
      file_path: "src/pages/Settings.tsx",
      input: JSON.stringify({ file_path: "src/pages/Settings.tsx", old_string: "placeholder", new_string: "SettingsTabs component" }),
      output: JSON.stringify({ success: true }),
      error: null,
      duration: 30,
      timestamp: minutesAgo(25),
    },
    {
      id: uuid(),
      agent_id: mainAgentId,
      hook_type: "PostToolUse",
      category: "search",
      tool: "Grep",
      file_path: null,
      input: JSON.stringify({ pattern: "EventSource", glob: "**/*.ts" }),
      output: JSON.stringify({ matches: 4 }),
      error: null,
      duration: 45,
      timestamp: minutesAgo(22),
    },
    {
      id: uuid(),
      agent_id: mainAgentId,
      hook_type: "PostToolUse",
      category: "command",
      tool: "Bash",
      file_path: null,
      input: JSON.stringify({ command: "pnpm typecheck" }),
      output: JSON.stringify({ exit_code: 0, output: "No errors found." }),
      error: null,
      duration: 3200,
      timestamp: minutesAgo(18),
    },
    {
      id: uuid(),
      agent_id: subAgent2Id,
      hook_type: "SessionStart",
      category: "lifecycle",
      tool: null,
      file_path: null,
      input: JSON.stringify({ working_directory: workingDir }),
      output: null,
      error: null,
      duration: null,
      timestamp: minutesAgo(15),
    },
    {
      id: uuid(),
      agent_id: subAgent2Id,
      hook_type: "PostToolUse",
      category: "file_operation",
      tool: "Read",
      file_path: "src/components/KanbanBoard.tsx",
      input: JSON.stringify({ file_path: "src/components/KanbanBoard.tsx" }),
      output: JSON.stringify({ lines: 320 }),
      error: null,
      duration: 14,
      timestamp: minutesAgo(13),
    },
    {
      id: uuid(),
      agent_id: mainAgentId,
      hook_type: "PostToolUse",
      category: "command",
      tool: "Bash",
      file_path: null,
      input: JSON.stringify({ command: "pnpm test -- --grep sse" }),
      output: JSON.stringify({ exit_code: 0, output: "PASS  sse-client.test.ts\n  3 tests passed" }),
      error: null,
      duration: 5600,
      timestamp: minutesAgo(10),
    },
    {
      id: uuid(),
      agent_id: subAgent1Id,
      hook_type: "PostToolUse",
      category: "file_operation",
      tool: "Write",
      file_path: "src/components/SettingsTabs.tsx",
      input: JSON.stringify({ file_path: "src/components/SettingsTabs.tsx" }),
      output: JSON.stringify({ success: true, bytes: 2450 }),
      error: null,
      duration: 18,
      timestamp: minutesAgo(8),
    },
    {
      id: uuid(),
      agent_id: subAgent2Id,
      hook_type: "PostToolUseFailure",
      category: "error",
      tool: "Bash",
      file_path: null,
      input: JSON.stringify({ command: "pnpm build" }),
      output: null,
      error: "Type error: Property 'onDrop' does not exist on type 'KanbanColumnProps'",
      duration: 2100,
      timestamp: minutesAgo(5),
    },
  ];

  return {
    projectId,
    sprint1Id,
    sprint2Id,
    sprint3Id,
    sessionId,
    mainAgentId,
    subAgent1Id,
    subAgent2Id,
    now,
    workingDir,
    sprint1Tasks,
    sprint2Tasks,
    sprint3Tasks,
    demoEvents,
  };
}

// ---------------------------------------------------------------------------
// Clean existing demo data
// ---------------------------------------------------------------------------

function cleanDemoData(db) {
  console.log("Limpando dados demo existentes...");

  // Find existing demo project(s) by name
  const existingProjects = db
    .prepare("SELECT id FROM projects WHERE name = ?")
    .all(DEMO_PROJECT_NAME);

  if (existingProjects.length === 0) {
    console.log("  Nenhum dado demo encontrado para limpar.");
    return 0;
  }

  let totalDeleted = 0;

  for (const project of existingProjects) {
    const pid = project.id;

    // Delete in dependency order (children first)
    // Task activities linked to prd_tasks of this project
    const taskIds = db
      .prepare("SELECT id FROM prd_tasks WHERE project_id = ?")
      .all(pid)
      .map((r) => r.id);

    if (taskIds.length > 0) {
      const placeholders = taskIds.map(() => "?").join(",");
      const actDel = db
        .prepare(`DELETE FROM task_activities WHERE prd_task_id IN (${placeholders})`)
        .run(...taskIds);
      totalDeleted += actDel.changes;
    }

    // Agent-task bindings linked to prd_tasks
    if (taskIds.length > 0) {
      const placeholders = taskIds.map(() => "?").join(",");
      const bindDel = db
        .prepare(`DELETE FROM agent_task_bindings WHERE prd_task_id IN (${placeholders})`)
        .run(...taskIds);
      totalDeleted += bindDel.changes;
    }

    // Correlation audit log by session (find sessions bound to this project)
    const boundSessions = db
      .prepare("SELECT session_id FROM session_project_bindings WHERE project_id = ?")
      .all(pid)
      .map((r) => r.session_id);

    for (const sid of boundSessions) {
      const auditDel = db.prepare("DELETE FROM correlation_audit_log WHERE session_id = ?").run(sid);
      totalDeleted += auditDel.changes;

      const eventsDel = db.prepare("DELETE FROM events WHERE session_id = ?").run(sid);
      totalDeleted += eventsDel.changes;

      const agentsDel = db.prepare("DELETE FROM agents WHERE session_id = ?").run(sid);
      totalDeleted += agentsDel.changes;

      const filesDel = db.prepare("DELETE FROM file_changes WHERE session_id = ?").run(sid);
      totalDeleted += filesDel.changes;

      const taskItemsDel = db.prepare("DELETE FROM task_items WHERE session_id = ?").run(sid);
      totalDeleted += taskItemsDel.changes;

      const sessionDel = db.prepare("DELETE FROM sessions WHERE id = ?").run(sid);
      totalDeleted += sessionDel.changes;
    }

    // Session-project bindings
    const spbDel = db.prepare("DELETE FROM session_project_bindings WHERE project_id = ?").run(pid);
    totalDeleted += spbDel.changes;

    // PRD documents
    const docsDel = db.prepare("DELETE FROM prd_documents WHERE project_id = ?").run(pid);
    totalDeleted += docsDel.changes;

    // PRD tasks
    const tasksDel = db.prepare("DELETE FROM prd_tasks WHERE project_id = ?").run(pid);
    totalDeleted += tasksDel.changes;

    // Sprints
    const sprintsDel = db.prepare("DELETE FROM sprints WHERE project_id = ?").run(pid);
    totalDeleted += sprintsDel.changes;

    // Project registry
    const regDel = db.prepare("DELETE FROM project_registry WHERE project_id = ?").run(pid);
    totalDeleted += regDel.changes;

    // Project itself
    const projDel = db.prepare("DELETE FROM projects WHERE id = ?").run(pid);
    totalDeleted += projDel.changes;
  }

  console.log(
    `  Removidos ${totalDeleted} registros de ${existingProjects.length} projeto(s) demo.`
  );
  return totalDeleted;
}

// ---------------------------------------------------------------------------
// Insert Demo Data
// ---------------------------------------------------------------------------

function insertDemoData(db) {
  const data = buildDemoData();
  const counts = {
    project: 0,
    sprints: 0,
    tasks: 0,
    session: 0,
    agents: 0,
    events: 0,
    bindings: 0,
    registry: 0,
  };

  // --- 1. Project ---
  db.prepare(
    `INSERT INTO projects (id, name, description, prd_source, prd_content, status, total_tasks, completed_tasks, current_sprint_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`
  ).run(
    data.projectId,
    DEMO_PROJECT_NAME,
    "A full-stack task management application with Kanban boards, real-time updates, and team collaboration features.",
    "demo://task-manager-prd.md",
    "",
    15, // total tasks
    8,  // completed tasks (5 from sprint 1 + 3 from sprint 2)
    data.sprint2Id,
    daysAgo(14),
    data.now
  );
  counts.project = 1;
  console.log(`  Projeto: "${DEMO_PROJECT_NAME}" (${data.projectId.slice(0, 8)}...)`);

  // --- 2. Sprints ---
  const insertSprint = db.prepare(
    `INSERT INTO sprints (id, project_id, name, description, "order", status, started_at, completed_at, total_tasks, completed_tasks)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  insertSprint.run(
    data.sprint1Id,
    data.projectId,
    "Core Backend",
    "Set up the backend infrastructure: Express server, SQLite database, REST API, authentication, and integration tests.",
    1,
    "completed",
    daysAgo(14),
    daysAgo(7),
    5,
    5
  );

  insertSprint.run(
    data.sprint2Id,
    data.projectId,
    "Frontend Dashboard",
    "Build the React frontend with task list, Kanban board, real-time updates, settings page, and dark mode.",
    2,
    "active",
    daysAgo(7),
    null,
    6,
    3
  );

  insertSprint.run(
    data.sprint3Id,
    data.projectId,
    "Polish & Launch",
    "Final polish: database optimization, mobile responsiveness, user documentation, and CI/CD pipeline.",
    3,
    "planned",
    null,
    null,
    4,
    0
  );

  counts.sprints = 3;
  console.log(`  Sprints: 3 (Core Backend, Frontend Dashboard, Polish & Launch)`);

  // --- 3. PRD Tasks ---
  const insertTask = db.prepare(
    `INSERT INTO prd_tasks (id, project_id, sprint_id, title, description, status, priority, complexity, tags, depends_on, blocked_by, assigned_agent, started_at, completed_at, prd_section, prd_subsection, prd_line_start, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]', ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  // Sprint 1 tasks
  for (const task of data.sprint1Tasks) {
    insertTask.run(
      task.id,
      data.projectId,
      data.sprint1Id,
      task.title,
      task.description,
      task.status,
      task.priority,
      task.complexity,
      task.tags,
      null, // assigned_agent
      daysAgo(14), // started_at
      daysAgo(7),  // completed_at
      "Sprint 1 - Core Backend",
      task.prd_subsection,
      1,
      daysAgo(14),
      daysAgo(7)
    );
  }

  // Sprint 2 tasks
  for (const task of data.sprint2Tasks) {
    const startedAt = task.status !== "planned" ? daysAgo(7) : null;
    const completedAt = task.status === "completed" ? daysAgo(2) : null;
    const updatedAt = task.status === "completed" ? daysAgo(2) : data.now;

    insertTask.run(
      task.id,
      data.projectId,
      data.sprint2Id,
      task.title,
      task.description,
      task.status,
      task.priority,
      task.complexity,
      task.tags,
      task.assigned_agent || null,
      startedAt,
      completedAt,
      "Sprint 2 - Frontend Dashboard",
      task.prd_subsection,
      2,
      daysAgo(7),
      updatedAt
    );
  }

  // Sprint 3 tasks
  for (const task of data.sprint3Tasks) {
    insertTask.run(
      task.id,
      data.projectId,
      data.sprint3Id,
      task.title,
      task.description,
      task.status,
      task.priority,
      task.complexity,
      task.tags,
      null,
      null,
      null,
      "Sprint 3 - Polish & Launch",
      task.prd_subsection,
      3,
      daysAgo(3),
      daysAgo(3)
    );
  }

  const totalTasks = data.sprint1Tasks.length + data.sprint2Tasks.length + data.sprint3Tasks.length;
  counts.tasks = totalTasks;
  console.log(`  Tasks: ${totalTasks} (5 completed + 3 completed + 2 in_progress + 1 planned + 4 planned)`);

  // --- 4. Demo Session ---
  db.prepare(
    `INSERT INTO sessions (id, started_at, working_directory, status, agent_count, event_count)
     VALUES (?, ?, ?, 'active', ?, ?)`
  ).run(
    data.sessionId,
    minutesAgo(45),
    data.workingDir,
    3, // 3 agents
    data.demoEvents.length
  );
  counts.session = 1;
  console.log(`  Sessao: ${data.sessionId.slice(0, 8)}... (active, 45min atras)`);

  // --- 5. Demo Agents ---
  const insertAgent = db.prepare(
    `INSERT INTO agents (id, session_id, name, type, status, first_seen_at, last_activity_at, current_task, tool_call_count, error_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  // Main agent - actively working on SSE integration
  insertAgent.run(
    data.mainAgentId,
    data.sessionId,
    "main",
    "general-purpose",
    "active",
    minutesAgo(45),
    minutesAgo(10),
    "Add real-time updates via SSE",
    7, // Read x2, Edit x1, Write x1, Grep x1, Bash x2
    0
  );

  // Subagent 1 - working on settings page
  insertAgent.run(
    data.subAgent1Id,
    data.sessionId,
    "subagent-1",
    "general-purpose",
    "active",
    minutesAgo(30),
    minutesAgo(8),
    "Create settings page",
    3, // Read x1, Edit x1, Write x1
    0
  );

  // Subagent 2 - hit an error while working on Kanban
  insertAgent.run(
    data.subAgent2Id,
    data.sessionId,
    "subagent-2",
    "general-purpose",
    "error",
    minutesAgo(15),
    minutesAgo(5),
    "Implement drag-and-drop Kanban",
    2, // Read x1, Bash(fail) x1
    1
  );

  counts.agents = 3;
  console.log(`  Agentes: 3 (main=active, subagent-1=active, subagent-2=error)`);

  // --- 6. Demo Events ---
  const insertEvent = db.prepare(
    `INSERT INTO events (id, session_id, agent_id, timestamp, hook_type, category, tool, file_path, input, output, error, duration)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const evt of data.demoEvents) {
    insertEvent.run(
      evt.id,
      data.sessionId,
      evt.agent_id,
      evt.timestamp,
      evt.hook_type,
      evt.category,
      evt.tool,
      evt.file_path,
      evt.input,
      evt.output,
      evt.error,
      evt.duration
    );
  }

  counts.events = data.demoEvents.length;
  console.log(`  Eventos: ${data.demoEvents.length} (Read, Edit, Write, Grep, Bash, SessionStart, PostToolUseFailure)`);

  // --- 7. Session-Project Binding ---
  db.prepare(
    `INSERT INTO session_project_bindings (session_id, project_id, bound_at)
     VALUES (?, ?, ?)`
  ).run(data.sessionId, data.projectId, minutesAgo(45));
  counts.bindings = 1;
  console.log(`  Session-Project binding: sessao vinculada ao projeto demo`);

  // --- 8. Project Registry ---
  db.prepare(
    `INSERT OR REPLACE INTO project_registry (working_directory, project_id, registered_at, prd_path, hooks_installed)
     VALUES (?, ?, ?, ?, 1)`
  ).run(
    data.workingDir,
    data.projectId,
    daysAgo(14),
    "demo://task-manager-prd.md"
  );
  counts.registry = 1;
  console.log(`  Project Registry: ${data.workingDir}`);

  return { counts, data };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const shouldClean = process.argv.includes("--clean");

  console.log("=".repeat(60));
  console.log("  CAM Demo Data Seed");
  console.log("=".repeat(60));
  console.log();

  // Resolve paths
  const dbPath = resolveDbPath();
  console.log(`Database: ${dbPath}`);

  const schemaPath = resolveSchemaPath();
  if (!schemaPath) {
    console.error(`ERRO: Schema nao encontrado em "${SCHEMA_RELATIVE_PATH}".`);
    console.error("Execute este script a partir da raiz do projeto.");
    process.exit(1);
  }
  console.log(`Schema:   ${schemaPath}`);
  console.log();

  // Load better-sqlite3
  const Database = loadDatabase();

  // Open database
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Ensure tables exist
  console.log("Verificando schema...");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schemaSql);
  console.log("  Schema OK (tabelas existem).");
  console.log();

  // Clean if requested
  if (shouldClean) {
    cleanDemoData(db);
    console.log();
  } else {
    // Check if demo data already exists
    const existing = db
      .prepare("SELECT COUNT(*) as cnt FROM projects WHERE name = ?")
      .get(DEMO_PROJECT_NAME);
    if (existing.cnt > 0) {
      console.log(`AVISO: Projeto demo "${DEMO_PROJECT_NAME}" ja existe.`);
      console.log("Use --clean para remover dados existentes antes de inserir:");
      console.log("  node scripts/seed-demo.cjs --clean");
      console.log();
      db.close();
      process.exit(1);
    }
  }

  // Insert demo data in a transaction
  console.log("Inserindo dados demo...");
  console.log("-".repeat(60));

  const { counts, data } = db.transaction(() => {
    return insertDemoData(db);
  })();

  console.log();

  // Summary
  console.log("=".repeat(60));
  console.log("  SEED COMPLETO");
  console.log("=".repeat(60));
  console.log(`  Projeto:              ${counts.project} ("${DEMO_PROJECT_NAME}")`);
  console.log(`  Sprints:              ${counts.sprints} (completed, active, planned)`);
  console.log(`  Tasks:                ${counts.tasks} (8 completed, 2 in_progress, 5 planned)`);
  console.log(`  Sessao:               ${counts.session} (active)`);
  console.log(`  Agentes:              ${counts.agents} (2 active, 1 error)`);
  console.log(`  Eventos:              ${counts.events}`);
  console.log(`  Session Bindings:     ${counts.bindings}`);
  console.log(`  Registry Entries:     ${counts.registry}`);
  console.log("-".repeat(60));
  console.log(`  Project ID:           ${data.projectId}`);
  console.log(`  Sprint 1 (done):      ${data.sprint1Id}`);
  console.log(`  Sprint 2 (active):    ${data.sprint2Id}`);
  console.log(`  Sprint 3 (planned):   ${data.sprint3Id}`);
  console.log(`  Session ID:           ${data.sessionId}`);
  console.log("=".repeat(60));
  console.log();
  console.log("Inicie o dashboard para ver os dados:");
  console.log("  pnpm dev");
  console.log("  Abra http://localhost:7891");
  console.log();

  db.close();
}

main();
