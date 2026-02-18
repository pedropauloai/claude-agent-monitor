-- Claude Agent Monitor - Database Schema
-- SQLite tables for both Pilar 1 (Agent Monitor) and Pilar 2 (PRD Tracker)

-- === Pilar 1: Agent Monitor ===

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  working_directory TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'error')),
  agent_count INTEGER NOT NULL DEFAULT 0,
  event_count INTEGER NOT NULL DEFAULT 0,
  metadata TEXT
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general-purpose',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'idle', 'error', 'completed', 'shutdown')),
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_activity_at TEXT NOT NULL DEFAULT (datetime('now')),
  current_task TEXT,
  tool_call_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (id, session_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  hook_type TEXT NOT NULL,
  category TEXT NOT NULL,
  tool TEXT,
  file_path TEXT,
  input TEXT,
  output TEXT,
  error TEXT,
  duration REAL,
  metadata TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_agent ON events(session_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(session_id, category);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_tool ON events(tool);

CREATE TABLE IF NOT EXISTS file_changes (
  file_path TEXT NOT NULL,
  session_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'modified', 'read')),
  first_touched_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_touched_at TEXT NOT NULL DEFAULT (datetime('now')),
  touch_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (file_path, session_id, agent_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS task_items (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  owner TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- === Session Groups (DEPRECATED Sprint 8: replaced by project_registry) ===
-- Tables kept for backward compatibility with existing databases.

CREATE TABLE IF NOT EXISTS session_groups (
  id TEXT PRIMARY KEY,
  name TEXT,
  main_session_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (main_session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS session_group_members (
  group_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  agent_name TEXT,
  agent_type TEXT,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (group_id, session_id),
  FOREIGN KEY (group_id) REFERENCES session_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_session_group_members_session ON session_group_members(session_id);

-- === Pilar 2: PRD Tracker ===

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  prd_source TEXT NOT NULL DEFAULT '',
  prd_content TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  total_tasks INTEGER NOT NULL DEFAULT 0,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  current_sprint_id TEXT,
  metadata TEXT
);

CREATE TABLE IF NOT EXISTS sprints (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed')),
  started_at TEXT,
  completed_at TEXT,
  total_tasks INTEGER NOT NULL DEFAULT 0,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  metadata TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sprints_project ON sprints(project_id);

CREATE TABLE IF NOT EXISTS prd_tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  sprint_id TEXT,
  external_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  acceptance_criteria TEXT,
  status TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'planned', 'pending', 'in_progress', 'in_review', 'completed', 'blocked', 'deferred')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  complexity INTEGER,
  tags TEXT,
  depends_on TEXT NOT NULL DEFAULT '[]',
  blocked_by TEXT NOT NULL DEFAULT '[]',
  assigned_agent TEXT,
  started_at TEXT,
  completed_at TEXT,
  session_id TEXT,
  prd_section TEXT,
  prd_subsection TEXT,
  prd_line_start INTEGER,
  prd_line_end INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_prd_tasks_project ON prd_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_prd_tasks_sprint ON prd_tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_prd_tasks_status ON prd_tasks(status);

CREATE TABLE IF NOT EXISTS task_activities (
  id TEXT PRIMARY KEY,
  prd_task_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  details TEXT,
  FOREIGN KEY (prd_task_id) REFERENCES prd_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_activities_task ON task_activities(prd_task_id);

CREATE TABLE IF NOT EXISTS prd_documents (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  raw_content TEXT NOT NULL,
  sections TEXT NOT NULL DEFAULT '[]',
  parsed_at TEXT NOT NULL DEFAULT (datetime('now')),
  parse_method TEXT NOT NULL DEFAULT 'structured' CHECK (parse_method IN ('structured', 'ai_assisted', 'manual')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_prd_documents_project ON prd_documents(project_id);

-- === Correlation Audit Log (Sprint 7) ===

CREATE TABLE IF NOT EXISTS correlation_audit_log (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  prd_task_id TEXT,
  session_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  layer TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0,
  matched INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (prd_task_id) REFERENCES prd_tasks(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_correlation_audit_event ON correlation_audit_log(event_id);
CREATE INDEX IF NOT EXISTS idx_correlation_audit_task ON correlation_audit_log(prd_task_id);
CREATE INDEX IF NOT EXISTS idx_correlation_audit_timestamp ON correlation_audit_log(timestamp);

-- === Session-Project Bindings (Sprint 7) ===

CREATE TABLE IF NOT EXISTS session_project_bindings (
  session_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  bound_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- === Project Registry (Sprint 8) ===

CREATE TABLE IF NOT EXISTS project_registry (
  working_directory TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  registered_at TEXT NOT NULL DEFAULT (datetime('now')),
  prd_path TEXT,
  hooks_installed INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_registry_project ON project_registry(project_id);

-- === Agent-Task Bindings (Sprint 7) ===

CREATE TABLE IF NOT EXISTS agent_task_bindings (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  prd_task_id TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0.5,
  bound_at TEXT NOT NULL DEFAULT (datetime('now')),
  expired_at TEXT,
  FOREIGN KEY (prd_task_id) REFERENCES prd_tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_task_bindings_agent ON agent_task_bindings(agent_id, session_id);
CREATE INDEX IF NOT EXISTS idx_agent_task_bindings_task ON agent_task_bindings(prd_task_id);
CREATE INDEX IF NOT EXISTS idx_agent_task_bindings_active ON agent_task_bindings(agent_id, session_id, expired_at);

-- For existing databases, run these ALTER TABLE statements manually:
-- ALTER TABLE events ADD COLUMN correlation_id TEXT;
-- ALTER TABLE events ADD COLUMN causation_id TEXT;
