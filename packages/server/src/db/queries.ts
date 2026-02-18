import type Database from "better-sqlite3";
import type BetterSqlite3 from "better-sqlite3";
import { getDb } from "./index.js";

function db(): Database.Database {
  return getDb();
}

type Statement = BetterSqlite3.Statement;

// === Sessions ===

export const sessionQueries: Record<string, () => Statement> = {
  insert() {
    return db().prepare(`
      INSERT INTO sessions (id, started_at, working_directory, status, agent_count, event_count, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
  },

  getById() {
    return db().prepare(`SELECT * FROM sessions WHERE id = ?`);
  },

  getAll() {
    return db().prepare(`
      SELECT * FROM sessions
      ORDER BY started_at DESC
      LIMIT ? OFFSET ?
    `);
  },

  getByStatus() {
    return db().prepare(`
      SELECT * FROM sessions
      WHERE status = ?
      ORDER BY started_at DESC
      LIMIT ? OFFSET ?
    `);
  },

  updateStatus() {
    return db().prepare(
      `UPDATE sessions SET status = ?, ended_at = ? WHERE id = ?`,
    );
  },

  incrementEventCount() {
    return db().prepare(
      `UPDATE sessions SET event_count = event_count + 1 WHERE id = ?`,
    );
  },

  updateAgentCount() {
    return db().prepare(`UPDATE sessions SET agent_count = ? WHERE id = ?`);
  },

  getActiveStaleSessions() {
    return db().prepare(`
      SELECT s.id,
        (SELECT MAX(e.timestamp) FROM events e WHERE e.session_id = s.id) as last_event_at
      FROM sessions s
      WHERE s.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM events e
          WHERE e.session_id = s.id AND e.timestamp > ?
        )
        AND s.started_at < ?
    `);
  },

  deleteById() {
    return db().prepare(`DELETE FROM sessions WHERE id = ?`);
  },
};

// === Agents ===

export const agentQueries: Record<string, () => Statement> = {
  upsert() {
    return db().prepare(`
      INSERT INTO agents (id, session_id, name, type, status, first_seen_at, last_activity_at, tool_call_count, error_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id, session_id) DO UPDATE SET
        last_activity_at = excluded.last_activity_at,
        status = excluded.status
    `);
  },

  getBySession() {
    return db().prepare(
      `SELECT * FROM agents WHERE session_id = ? ORDER BY first_seen_at ASC`,
    );
  },

  getById() {
    return db().prepare(`SELECT * FROM agents WHERE id = ? AND session_id = ?`);
  },

  updateStatus() {
    return db().prepare(
      `UPDATE agents SET status = ?, last_activity_at = ? WHERE id = ? AND session_id = ?`,
    );
  },

  incrementToolCalls() {
    return db().prepare(`
      UPDATE agents SET tool_call_count = tool_call_count + 1, last_activity_at = ?
      WHERE id = ? AND session_id = ?
    `);
  },

  incrementErrors() {
    return db().prepare(`
      UPDATE agents SET error_count = error_count + 1, last_activity_at = ?
      WHERE id = ? AND session_id = ?
    `);
  },

  updateAgentName() {
    return db().prepare(
      `UPDATE agents SET name = ? WHERE id = ? AND session_id = ?`,
    );
  },

  updateCurrentTask() {
    return db().prepare(
      `UPDATE agents SET current_task = ? WHERE id = ? AND session_id = ?`,
    );
  },

  getActiveStale() {
    return db().prepare(`
      SELECT a.*, s.id as sess_id FROM agents a
      JOIN sessions s ON a.session_id = s.id
      WHERE a.status = 'active'
        AND s.status = 'active'
        AND a.last_activity_at < ?
    `);
  },

  /** Find agents created recently whose name equals their ID (unnamed/temporary). */
  getRecentUnnamed() {
    return db().prepare(`
      SELECT * FROM agents
      WHERE name = id
        AND first_seen_at > ?
      ORDER BY first_seen_at DESC
    `);
  },
};

// === Events ===

export const eventQueries: Record<string, () => Statement> = {
  insert() {
    return db().prepare(`
      INSERT INTO events (id, session_id, agent_id, timestamp, hook_type, category, tool, file_path, input, output, error, duration, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
  },

  getBySession() {
    return db().prepare(`
      SELECT * FROM events
      WHERE session_id = ?
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `);
  },

  getBySessionAndCategory() {
    return db().prepare(`
      SELECT * FROM events
      WHERE session_id = ? AND category = ?
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `);
  },

  getBySessionAndAgent() {
    return db().prepare(`
      SELECT * FROM events
      WHERE session_id = ? AND agent_id = ?
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `);
  },

  getBySessionAndTool() {
    return db().prepare(`
      SELECT * FROM events
      WHERE session_id = ? AND tool = ?
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `);
  },

  getBySessionSince() {
    return db().prepare(`
      SELECT * FROM events
      WHERE session_id = ? AND timestamp > ?
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `);
  },

  getByAgentAndCategory() {
    return db().prepare(`
      SELECT * FROM events
      WHERE session_id = ? AND agent_id = ? AND category = ?
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `);
  },

  countBySession() {
    return db().prepare(
      `SELECT COUNT(*) as count FROM events WHERE session_id = ?`,
    );
  },

  getToolBreakdown() {
    return db().prepare(`
      SELECT tool, COUNT(*) as count
      FROM events
      WHERE session_id = ? AND tool IS NOT NULL
      GROUP BY tool
      ORDER BY count DESC
    `);
  },

  getAgentBreakdown() {
    return db().prepare(`
      SELECT agent_id, COUNT(*) as events, SUM(CASE WHEN category = 'error' THEN 1 ELSE 0 END) as errors
      FROM events
      WHERE session_id = ?
      GROUP BY agent_id
    `);
  },

  getTimeline() {
    return db().prepare(`
      SELECT strftime('%H:%M', timestamp) as minute, COUNT(*) as events
      FROM events
      WHERE session_id = ?
      GROUP BY minute
      ORDER BY minute ASC
    `);
  },
};

// === File Changes ===

export const fileChangeQueries: Record<string, () => Statement> = {
  upsert() {
    return db().prepare(`
      INSERT INTO file_changes (file_path, session_id, agent_id, change_type, first_touched_at, last_touched_at, touch_count)
      VALUES (?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(file_path, session_id, agent_id) DO UPDATE SET
        change_type = CASE
          WHEN excluded.change_type IN ('created', 'modified') THEN excluded.change_type
          ELSE file_changes.change_type
        END,
        last_touched_at = excluded.last_touched_at,
        touch_count = file_changes.touch_count + 1
    `);
  },

  getBySession() {
    return db().prepare(`
      SELECT * FROM file_changes
      WHERE session_id = ?
      ORDER BY last_touched_at DESC
    `);
  },
};

// === Task Items ===

export const taskItemQueries: Record<string, () => Statement> = {
  upsert() {
    return db().prepare(`
      INSERT INTO task_items (id, session_id, subject, status, owner, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        owner = excluded.owner,
        updated_at = excluded.updated_at
    `);
  },

  getBySession() {
    return db().prepare(
      `SELECT * FROM task_items WHERE session_id = ? ORDER BY created_at ASC`,
    );
  },
};

// === Project Registry (Sprint 8) ===

export const projectRegistryQueries: Record<string, () => Statement> = {
  register() {
    return db().prepare(`
      INSERT OR REPLACE INTO project_registry (working_directory, project_id, registered_at, prd_path, hooks_installed)
      VALUES (?, ?, datetime('now'), ?, ?)
    `);
  },

  getByWorkingDir() {
    return db().prepare(`
      SELECT working_directory, project_id, registered_at, prd_path, hooks_installed
      FROM project_registry WHERE working_directory = ?
    `);
  },

  getByWorkingDirPrefix() {
    return db().prepare(`
      SELECT working_directory, project_id, registered_at, prd_path, hooks_installed
      FROM project_registry WHERE ? LIKE working_directory || '%'
      ORDER BY length(working_directory) DESC
      LIMIT 1
    `);
  },

  getByProject() {
    return db().prepare(`
      SELECT working_directory, project_id, registered_at, prd_path, hooks_installed
      FROM project_registry WHERE project_id = ?
    `);
  },

  getAll() {
    return db().prepare(`
      SELECT pr.working_directory, pr.project_id, pr.registered_at, pr.prd_path, pr.hooks_installed,
             p.name as project_name, p.status as project_status
      FROM project_registry pr
      JOIN projects p ON pr.project_id = p.id
      ORDER BY pr.registered_at DESC
    `);
  },

  updateHooksInstalled() {
    return db().prepare(`
      UPDATE project_registry SET hooks_installed = ? WHERE working_directory = ?
    `);
  },

  updatePrdPath() {
    return db().prepare(`
      UPDATE project_registry SET prd_path = ? WHERE working_directory = ?
    `);
  },

  delete() {
    return db().prepare(`
      DELETE FROM project_registry WHERE working_directory = ?
    `);
  },
};

// === Projects ===

export const projectQueries: Record<string, () => Statement> = {
  insert() {
    return db().prepare(`
      INSERT INTO projects (id, name, description, prd_source, prd_content, created_at, updated_at, status, total_tasks, completed_tasks, current_sprint_id, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
  },

  getById() {
    return db().prepare(`SELECT * FROM projects WHERE id = ?`);
  },

  getAll() {
    return db().prepare(`SELECT * FROM projects ORDER BY updated_at DESC`);
  },

  update() {
    return db().prepare(`
      UPDATE projects SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        total_tasks = COALESCE(?, total_tasks),
        completed_tasks = COALESCE(?, completed_tasks),
        current_sprint_id = COALESCE(?, current_sprint_id),
        updated_at = ?
      WHERE id = ?
    `);
  },

  updateTaskCounts() {
    return db().prepare(`
      UPDATE projects SET
        total_tasks = (SELECT COUNT(*) FROM prd_tasks WHERE project_id = ?),
        completed_tasks = (SELECT COUNT(*) FROM prd_tasks WHERE project_id = ? AND status = 'completed'),
        updated_at = ?
      WHERE id = ?
    `);
  },

  deleteById() {
    return db().prepare(`DELETE FROM projects WHERE id = ?`);
  },
};

// === Sprints ===

export const sprintQueries: Record<string, () => Statement> = {
  insert() {
    return db().prepare(`
      INSERT INTO sprints (id, project_id, name, description, "order", status, started_at, completed_at, total_tasks, completed_tasks, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
  },

  getByProject() {
    return db().prepare(
      `SELECT * FROM sprints WHERE project_id = ? ORDER BY "order" ASC`,
    );
  },

  getById() {
    return db().prepare(`SELECT * FROM sprints WHERE id = ?`);
  },

  update() {
    return db().prepare(`
      UPDATE sprints SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        started_at = COALESCE(?, started_at),
        completed_at = COALESCE(?, completed_at),
        total_tasks = COALESCE(?, total_tasks),
        completed_tasks = COALESCE(?, completed_tasks)
      WHERE id = ?
    `);
  },

  updateTaskCounts() {
    return db().prepare(`
      UPDATE sprints SET
        total_tasks = (SELECT COUNT(*) FROM prd_tasks WHERE sprint_id = ?),
        completed_tasks = (SELECT COUNT(*) FROM prd_tasks WHERE sprint_id = ? AND status = 'completed')
      WHERE id = ?
    `);
  },

  getNextOrder() {
    return db().prepare(
      `SELECT COALESCE(MAX("order"), 0) + 1 as next_order FROM sprints WHERE project_id = ?`,
    );
  },

  deleteById() {
    return db().prepare(`DELETE FROM sprints WHERE id = ?`);
  },
};

// === PRD Tasks ===

export const prdTaskQueries: Record<string, () => Statement> = {
  insert() {
    return db().prepare(`
      INSERT INTO prd_tasks (id, project_id, sprint_id, external_id, title, description, acceptance_criteria, status, priority, complexity, tags, depends_on, blocked_by, assigned_agent, started_at, completed_at, session_id, prd_section, prd_subsection, prd_line_start, prd_line_end, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
  },

  getByProject() {
    return db().prepare(
      `SELECT * FROM prd_tasks WHERE project_id = ? ORDER BY created_at ASC`,
    );
  },

  getBySprint() {
    return db().prepare(
      `SELECT * FROM prd_tasks WHERE sprint_id = ? ORDER BY created_at ASC`,
    );
  },

  getByProjectAndStatus() {
    return db().prepare(
      `SELECT * FROM prd_tasks WHERE project_id = ? AND status = ? ORDER BY created_at ASC`,
    );
  },

  getByProjectAndAgent() {
    return db().prepare(
      `SELECT * FROM prd_tasks WHERE project_id = ? AND assigned_agent = ? ORDER BY created_at ASC`,
    );
  },

  getByProjectAndPriority() {
    return db().prepare(
      `SELECT * FROM prd_tasks WHERE project_id = ? AND priority = ? ORDER BY created_at ASC`,
    );
  },

  getById() {
    return db().prepare(`SELECT * FROM prd_tasks WHERE id = ?`);
  },

  update() {
    return db().prepare(`
      UPDATE prd_tasks SET
        status = COALESCE(?, status),
        priority = COALESCE(?, priority),
        assigned_agent = COALESCE(?, assigned_agent),
        sprint_id = COALESCE(?, sprint_id),
        external_id = COALESCE(?, external_id),
        started_at = COALESCE(?, started_at),
        completed_at = COALESCE(?, completed_at),
        session_id = COALESCE(?, session_id),
        updated_at = ?
      WHERE id = ?
    `);
  },

  getStatusSummary() {
    return db().prepare(`
      SELECT status, COUNT(*) as count
      FROM prd_tasks
      WHERE project_id = ?
      GROUP BY status
    `);
  },

  findByTitle() {
    return db().prepare(
      `SELECT * FROM prd_tasks WHERE project_id = ? AND title LIKE ?`,
    );
  },

  deleteById() {
    return db().prepare(`DELETE FROM prd_tasks WHERE id = ?`);
  },
};

// === Task Activities ===

export const taskActivityQueries: Record<string, () => Statement> = {
  insert() {
    return db().prepare(`
      INSERT INTO task_activities (id, prd_task_id, event_id, session_id, agent_id, activity_type, timestamp, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
  },

  getByTask() {
    return db().prepare(`
      SELECT * FROM task_activities
      WHERE prd_task_id = ?
      ORDER BY timestamp DESC
    `);
  },
};

// === PRD Documents ===

export const prdDocumentQueries: Record<string, () => Statement> = {
  insert() {
    return db().prepare(`
      INSERT INTO prd_documents (id, project_id, version, raw_content, sections, parsed_at, parse_method)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
  },

  getByProject() {
    return db().prepare(`
      SELECT * FROM prd_documents
      WHERE project_id = ?
      ORDER BY version DESC
      LIMIT 1
    `);
  },

  getLatestVersion() {
    return db().prepare(`
      SELECT COALESCE(MAX(version), 0) + 1 as next_version
      FROM prd_documents WHERE project_id = ?
    `);
  },
};

// === Correlation Audit Log ===

export const correlationAuditQueries: Record<string, () => Statement> = {
  insert() {
    return db().prepare(`
      INSERT INTO correlation_audit_log (id, event_id, prd_task_id, session_id, agent_id, layer, score, matched, reason, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
  },

  getRecent() {
    return db().prepare(`
      SELECT cal.*, pt.title as task_title
      FROM correlation_audit_log cal
      LEFT JOIN prd_tasks pt ON cal.prd_task_id = pt.id
      ORDER BY cal.timestamp DESC
      LIMIT ? OFFSET ?
    `);
  },

  getByEvent() {
    return db().prepare(`
      SELECT * FROM correlation_audit_log WHERE event_id = ? ORDER BY score DESC
    `);
  },

  getByTask() {
    return db().prepare(`
      SELECT * FROM correlation_audit_log WHERE prd_task_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?
    `);
  },
};

// === Session-Project Bindings ===

export const sessionProjectBindingQueries: Record<string, () => Statement> = {
  bind() {
    return db().prepare(`
      INSERT INTO session_project_bindings (session_id, project_id, bound_at)
      VALUES (?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET project_id = excluded.project_id, bound_at = excluded.bound_at
    `);
  },

  getBySession() {
    return db().prepare(`SELECT * FROM session_project_bindings WHERE session_id = ?`);
  },

  getByProject() {
    return db().prepare(`SELECT * FROM session_project_bindings WHERE project_id = ?`);
  },
};

// === Task Completion Queries ===

export const taskCompletionQueries: Record<string, () => Statement> = {
  getHighConfidenceBindings() {
    return db().prepare(`
      SELECT atb.*, pt.title as task_title, pt.status as task_status, pt.sprint_id, pt.project_id
      FROM agent_task_bindings atb
      JOIN prd_tasks pt ON atb.prd_task_id = pt.id
      LEFT JOIN sprints s ON pt.sprint_id = s.id
      WHERE atb.session_id = ? AND atb.confidence >= ? AND atb.expired_at IS NULL
        AND pt.status != 'completed' AND pt.status != 'deferred' AND pt.status != 'backlog'
        AND (s."order" = 1 OR s.id IS NULL)
      ORDER BY atb.confidence DESC
    `);
  },

  getHighConfidenceBindingsForAgent() {
    return db().prepare(`
      SELECT atb.*, pt.title as task_title, pt.status as task_status, pt.sprint_id, pt.project_id
      FROM agent_task_bindings atb
      JOIN prd_tasks pt ON atb.prd_task_id = pt.id
      LEFT JOIN sprints s ON pt.sprint_id = s.id
      WHERE atb.agent_id = ? AND atb.session_id = ? AND atb.confidence >= ? AND atb.expired_at IS NULL
        AND pt.status != 'completed' AND pt.status != 'deferred' AND pt.status != 'backlog'
        AND (s."order" = 1 OR s.id IS NULL)
      ORDER BY atb.confidence DESC
    `);
  },

  completePrdTask() {
    return db().prepare(`
      UPDATE prd_tasks SET status = 'completed', completed_at = ?, updated_at = ?
      WHERE id = ? AND status != 'completed'
    `);
  },

  recalculateSprintTotals() {
    return db().prepare(`
      UPDATE sprints SET
        total_tasks = (SELECT COUNT(*) FROM prd_tasks WHERE sprint_id = ?),
        completed_tasks = (SELECT COUNT(*) FROM prd_tasks WHERE sprint_id = ? AND status = 'completed')
      WHERE id = ?
    `);
  },

  recalculateProjectTotals() {
    return db().prepare(`
      UPDATE projects SET
        total_tasks = (SELECT COUNT(*) FROM prd_tasks WHERE project_id = ?),
        completed_tasks = (SELECT COUNT(*) FROM prd_tasks WHERE project_id = ? AND status = 'completed'),
        updated_at = ?
      WHERE id = ?
    `);
  },

  getPendingHighConfidenceTasks() {
    return db().prepare(`
      SELECT DISTINCT pt.*, MAX(atb.confidence) as max_confidence, atb.agent_id as binding_agent_id
      FROM prd_tasks pt
      JOIN agent_task_bindings atb ON pt.id = atb.prd_task_id
      WHERE atb.confidence >= ? AND atb.expired_at IS NULL
        AND pt.status != 'completed' AND pt.status != 'deferred'
      GROUP BY pt.id
      ORDER BY max_confidence DESC
    `);
  },

  getCompletionStats() {
    return db().prepare(`
      SELECT
        (SELECT COUNT(*) FROM prd_tasks WHERE project_id = ?) as total,
        (SELECT COUNT(*) FROM prd_tasks WHERE project_id = ? AND status = 'completed') as completed
    `);
  },

  getAutoCompletedCount() {
    return db().prepare(`
      SELECT COUNT(DISTINCT cal.prd_task_id) as count
      FROM correlation_audit_log cal
      WHERE cal.layer = 'auto_complete' AND cal.matched = 1
        AND cal.prd_task_id IN (SELECT id FROM prd_tasks WHERE project_id = ?)
    `);
  },

  getTasksBySection() {
    return db().prepare(`
      SELECT * FROM prd_tasks WHERE prd_section LIKE ('%' || ? || '%') AND status != 'completed' AND status != 'deferred'
    `);
  },

  getTasksByIds() {
    // Note: caller must build the IN clause dynamically
    return db().prepare(`SELECT * FROM prd_tasks WHERE id = ? AND status != 'completed'`);
  },
};

// === Agent-Task Bindings ===

export const agentTaskBindingQueries: Record<string, () => Statement> = {
  bind() {
    return db().prepare(`
      INSERT INTO agent_task_bindings (id, agent_id, session_id, prd_task_id, confidence, bound_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
  },

  getActiveByAgent() {
    return db().prepare(`
      SELECT * FROM agent_task_bindings
      WHERE agent_id = ? AND session_id = ? AND expired_at IS NULL
      ORDER BY bound_at DESC LIMIT 1
    `);
  },

  getActiveByTask() {
    return db().prepare(`
      SELECT * FROM agent_task_bindings
      WHERE prd_task_id = ? AND expired_at IS NULL
    `);
  },

  expire() {
    return db().prepare(`
      UPDATE agent_task_bindings SET expired_at = ?
      WHERE agent_id = ? AND session_id = ? AND expired_at IS NULL
    `);
  },

  expireByTask() {
    return db().prepare(`
      UPDATE agent_task_bindings SET expired_at = ? WHERE prd_task_id = ? AND expired_at IS NULL
    `);
  },
};
