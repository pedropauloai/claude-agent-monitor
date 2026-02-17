import { randomUUID } from 'node:crypto';
import {
  taskCompletionQueries,
  correlationAuditQueries,
  agentTaskBindingQueries,
  prdTaskQueries,
  projectQueries,
  sprintQueries,
} from '../db/queries.js';
import { sseManager } from './sse-manager.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Minimum confidence score for auto-completion */
export const CONFIDENCE_THRESHOLD = 0.75;

/** Feature flag for auto-completion */
export const AUTO_COMPLETE_ENABLED = true;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompletionResult {
  taskId: string;
  taskTitle: string;
  confidence: number;
  agentId: string;
  autoCompleted: boolean;
  reason: string;
}

interface HighConfidenceBindingRow {
  id: string;
  agent_id: string;
  session_id: string;
  prd_task_id: string;
  confidence: number;
  bound_at: string;
  expired_at: string | null;
  task_title: string;
  task_status: string;
  sprint_id: string | null;
  project_id: string;
}

interface PrdTaskRow {
  id: string;
  project_id: string;
  sprint_id: string | null;
  title: string;
  status: string;
  prd_section: string | null;
}

// ---------------------------------------------------------------------------
// Core: Mark a single PRD task as completed
// ---------------------------------------------------------------------------

/**
 * Mark a PRD task as completed with audit logging.
 * Returns false if the task was already completed, not found, or in a backlog sprint.
 * Tasks in backlog sprints (order > 1) are protected from auto-completion.
 * Use `force: true` to override backlog protection (for manual batch operations).
 */
export function markPrdTaskCompleted(taskId: string, reason: string, force = false): boolean {
  const now = new Date().toISOString();

  const task = prdTaskQueries.getById().get(taskId) as PrdTaskRow | undefined;
  if (!task) return false;
  if (task.status === 'completed') return false;
  if (task.status === 'deferred' || task.status === 'backlog') return false;

  // Protect backlog sprint tasks from auto-completion
  if (!force && task.sprint_id) {
    const sprint = sprintQueries.getById().get(task.sprint_id) as { order: number } | undefined;
    if (sprint && sprint.order > 1) {
      console.log(`[task-completion] Skipping backlog task "${task.title}" (sprint order=${sprint.order})`);
      return false;
    }
  }

  // Update the task status
  const result = taskCompletionQueries.completePrdTask().run(now, now, taskId);
  if (result.changes === 0) return false;

  // Update sprint and project totals
  if (task.sprint_id) {
    updateSprintTotals(task.sprint_id);
  }
  updateProjectTotals(task.project_id);

  // Log to correlation audit
  try {
    correlationAuditQueries.insert().run(
      randomUUID(),
      'system',         // event_id - system-generated
      taskId,           // prd_task_id
      'system',         // session_id
      'system',         // agent_id
      'auto_complete',  // layer
      1.0,              // score
      1,                // matched
      reason,           // reason
      now,              // timestamp
    );
  } catch {
    // Audit must never break the completion
  }

  // Broadcast SSE events
  sseManager.broadcast('task_status_changed', {
    taskId,
    oldStatus: task.status,
    newStatus: 'completed',
    reason,
    source: 'auto_complete',
  });

  const project = projectQueries.getById().get(task.project_id) as {
    id: string;
    total_tasks: number;
    completed_tasks: number;
  } | undefined;
  if (project) {
    sseManager.broadcast('project_progress', {
      projectId: project.id,
      completedTasks: project.completed_tasks,
      totalTasks: project.total_tasks,
      percent: project.total_tasks > 0
        ? Math.round((project.completed_tasks / project.total_tasks) * 1000) / 10
        : 0,
    });
  }

  console.log(`[task-completion] Auto-completed task "${task.title}" (${taskId}) - ${reason}`);

  return true;
}

// ---------------------------------------------------------------------------
// Auto-complete tasks for a session (called on SessionEnd)
// ---------------------------------------------------------------------------

/**
 * Check all agent_task_bindings for this session and auto-complete
 * tasks with confidence >= CONFIDENCE_THRESHOLD.
 */
export function autoCompleteTasksForSession(sessionId: string): CompletionResult[] {
  if (!AUTO_COMPLETE_ENABLED) return [];

  const results: CompletionResult[] = [];

  try {
    const bindings = taskCompletionQueries.getHighConfidenceBindings().all(
      sessionId,
      CONFIDENCE_THRESHOLD,
    ) as HighConfidenceBindingRow[];

    // Deduplicate by task ID (pick highest confidence binding per task)
    const taskBindingMap = new Map<string, HighConfidenceBindingRow>();
    for (const binding of bindings) {
      const existing = taskBindingMap.get(binding.prd_task_id);
      if (!existing || binding.confidence > existing.confidence) {
        taskBindingMap.set(binding.prd_task_id, binding);
      }
    }

    for (const [, binding] of taskBindingMap) {
      const reason = `Auto-completed on SessionEnd (session: ${sessionId}, agent: ${binding.agent_id}, confidence: ${(binding.confidence * 100).toFixed(0)}%)`;
      const completed = markPrdTaskCompleted(binding.prd_task_id, reason);

      // Expire the binding after completion attempt
      const now = new Date().toISOString();
      agentTaskBindingQueries.expireByTask().run(now, binding.prd_task_id);

      results.push({
        taskId: binding.prd_task_id,
        taskTitle: binding.task_title,
        confidence: binding.confidence,
        agentId: binding.agent_id,
        autoCompleted: completed,
        reason,
      });
    }

    if (results.length > 0) {
      const completedCount = results.filter(r => r.autoCompleted).length;
      console.log(`[task-completion] SessionEnd ${sessionId}: auto-completed ${completedCount}/${results.length} tasks`);
    }
  } catch (err) {
    console.error(`[task-completion] Error in autoCompleteTasksForSession:`, err);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Auto-complete tasks for a specific agent (called on agent shutdown)
// ---------------------------------------------------------------------------

/**
 * Check agent_task_bindings for a specific agent and auto-complete
 * tasks with confidence >= CONFIDENCE_THRESHOLD.
 */
export function autoCompleteTasksForAgent(agentId: string, sessionId: string): CompletionResult[] {
  if (!AUTO_COMPLETE_ENABLED) return [];

  const results: CompletionResult[] = [];

  try {
    const bindings = taskCompletionQueries.getHighConfidenceBindingsForAgent().all(
      agentId,
      sessionId,
      CONFIDENCE_THRESHOLD,
    ) as HighConfidenceBindingRow[];

    for (const binding of bindings) {
      const reason = `Auto-completed on agent shutdown (agent: ${agentId}, session: ${sessionId}, confidence: ${(binding.confidence * 100).toFixed(0)}%)`;
      const completed = markPrdTaskCompleted(binding.prd_task_id, reason);

      // Expire the binding
      const now = new Date().toISOString();
      agentTaskBindingQueries.expireByTask().run(now, binding.prd_task_id);

      results.push({
        taskId: binding.prd_task_id,
        taskTitle: binding.task_title,
        confidence: binding.confidence,
        agentId: binding.agent_id,
        autoCompleted: completed,
        reason,
      });
    }

    if (results.length > 0) {
      const completedCount = results.filter(r => r.autoCompleted).length;
      console.log(`[task-completion] Agent ${agentId} shutdown: auto-completed ${completedCount}/${results.length} tasks`);
    }
  } catch (err) {
    console.error(`[task-completion] Error in autoCompleteTasksForAgent:`, err);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Totals recalculation
// ---------------------------------------------------------------------------

/** Recalculate completed_tasks count for a sprint from actual prd_tasks data */
export function updateSprintTotals(sprintId: string): void {
  try {
    taskCompletionQueries.recalculateSprintTotals().run(sprintId, sprintId, sprintId);
  } catch (err) {
    console.error(`[task-completion] Error recalculating sprint totals for ${sprintId}:`, err);
  }
}

/** Recalculate completed_tasks and total_tasks for a project */
export function updateProjectTotals(projectId: string): void {
  try {
    const now = new Date().toISOString();
    taskCompletionQueries.recalculateProjectTotals().run(projectId, projectId, now, projectId);
  } catch (err) {
    console.error(`[task-completion] Error recalculating project totals for ${projectId}:`, err);
  }
}

// ---------------------------------------------------------------------------
// Batch completion
// ---------------------------------------------------------------------------

/**
 * Batch-complete all tasks in a PRD section (e.g., "Sprint 8 - Project-First Architecture").
 * Returns the count of tasks that were actually updated.
 */
export function batchCompleteBySection(prdSection: string, status?: string): number {
  const tasks = taskCompletionQueries.getTasksBySection().all(prdSection) as PrdTaskRow[];
  let completedCount = 0;

  for (const task of tasks) {
    if (status && task.status !== status) continue;
    const reason = `Batch-completed by section: "${prdSection}"`;
    if (markPrdTaskCompleted(task.id, reason, true)) {
      completedCount++;
    }
  }

  if (completedCount > 0) {
    console.log(`[task-completion] Batch-completed ${completedCount} tasks in section "${prdSection}"`);
  }

  return completedCount;
}

/**
 * Batch-complete tasks by IDs.
 * Returns list of task IDs that were actually completed.
 */
export function batchCompleteByIds(taskIds: string[], reason?: string): string[] {
  const completed: string[] = [];

  for (const taskId of taskIds) {
    const completionReason = reason ?? `Batch-completed by ID`;
    if (markPrdTaskCompleted(taskId, completionReason, true)) {
      completed.push(taskId);
    }
  }

  if (completed.length > 0) {
    console.log(`[task-completion] Batch-completed ${completed.length}/${taskIds.length} tasks by IDs`);
  }

  return completed;
}

// ---------------------------------------------------------------------------
// Completion status summary
// ---------------------------------------------------------------------------

export interface CompletionStatus {
  total: number;
  completed: number;
  autoCompleted: number;
  pendingWithHighConfidence: Array<{
    taskId: string;
    title: string;
    status: string;
    maxConfidence: number;
    agentId: string;
  }>;
}

/**
 * Get completion status summary for a project.
 */
export function getCompletionStatus(projectId: string): CompletionStatus {
  const stats = taskCompletionQueries.getCompletionStats().get(projectId, projectId) as {
    total: number;
    completed: number;
  } | undefined;

  const autoCompletedRow = taskCompletionQueries.getAutoCompletedCount().get(projectId) as {
    count: number;
  } | undefined;

  const pendingRows = taskCompletionQueries.getPendingHighConfidenceTasks().all(
    CONFIDENCE_THRESHOLD,
  ) as Array<{
    id: string;
    title: string;
    status: string;
    project_id: string;
    max_confidence: number;
    binding_agent_id: string;
  }>;

  // Filter to this project
  const projectPending = pendingRows.filter(r => r.project_id === projectId);

  return {
    total: stats?.total ?? 0,
    completed: stats?.completed ?? 0,
    autoCompleted: autoCompletedRow?.count ?? 0,
    pendingWithHighConfidence: projectPending.map(r => ({
      taskId: r.id,
      title: r.title,
      status: r.status,
      maxConfidence: r.max_confidence,
      agentId: r.binding_agent_id,
    })),
  };
}
