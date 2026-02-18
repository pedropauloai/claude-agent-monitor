import { randomUUID } from 'node:crypto';
import type { AgentEvent } from '@cam/shared';
import { TASK_TOOLS } from '@cam/shared';
import {
  prdTaskQueries,
  taskActivityQueries,
  projectQueries,
  correlationAuditQueries,
  sessionProjectBindingQueries,
  agentTaskBindingQueries,
  sprintQueries,
} from '../db/queries.js';
import { updateTask } from './project-manager.js';
import { sseManager } from './sse-manager.js';
import { combinedSimilarity } from './string-similarity.js';

// ---------------------------------------------------------------------------
// Backlog sprint protection
// ---------------------------------------------------------------------------

/** Check if a task belongs to a backlog sprint (order > 1). Backlog tasks
 *  should never have their status changed automatically by the correlation engine. */
function isBacklogSprintTask(task: PrdTaskRow): boolean {
  if (!task.sprint_id) return false;
  const sprint = sprintQueries.getById().get(task.sprint_id) as { order: number } | undefined;
  return sprint !== undefined && sprint.order > 1;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PrdTaskRow {
  id: string;
  project_id: string;
  sprint_id: string | null;
  title: string;
  description: string;
  status: string;
  tags: string | null;
  assigned_agent: string | null;
  external_id: string | null;
  acceptance_criteria: string | null;
}

// Minimum confidence threshold for a match to trigger a status update
const CONFIDENCE_THRESHOLD = 0.6;

// ---------------------------------------------------------------------------
// Project row shape (used by session-project binding)
// ---------------------------------------------------------------------------

interface ProjectRow {
  id: string;
  name: string;
  prd_source: string;
}

// ---------------------------------------------------------------------------
// Session-Project Binding
// ---------------------------------------------------------------------------

/**
 * Bind a session to a project based on working directory matching.
 *
 * Heuristics (in order of priority):
 * 1. The project's `prd_source` path is contained within `workingDirectory`
 *    (e.g. prd_source = `/home/dev/myproject/PRD.md` and workDir starts with
 *    `/home/dev/myproject`).
 * 2. The project name matches one of the directory segments in `workingDirectory`.
 */
function bindSessionToProject(sessionId: string, workingDirectory: string): void {
  if (!workingDirectory) return;

  const projects = projectQueries.getAll().all() as ProjectRow[];
  if (projects.length === 0) return;

  // Normalise path separators to forward slashes for comparison
  const workDirNorm = workingDirectory.replace(/\\/g, '/').toLowerCase();

  for (const project of projects) {
    let matched = false;

    // Strategy 1: prd_source directory match
    if (project.prd_source) {
      const prdSourceNorm = project.prd_source.replace(/\\/g, '/').toLowerCase();
      // Extract the directory containing the PRD file
      const prdDir = prdSourceNorm.includes('/')
        ? prdSourceNorm.substring(0, prdSourceNorm.lastIndexOf('/'))
        : prdSourceNorm;

      if (prdDir && workDirNorm.includes(prdDir)) {
        matched = true;
      }
    }

    // Strategy 2: project name matches a directory segment
    if (!matched && project.name) {
      const projectNameNorm = project.name.toLowerCase().replace(/[\s_-]+/g, '-');
      const segments = workDirNorm.split('/').filter(s => s.length > 0);
      if (segments.some(seg => seg === projectNameNorm || seg.includes(projectNameNorm))) {
        matched = true;
      }
    }

    if (matched) {
      const now = new Date().toISOString();
      sessionProjectBindingQueries.bind().run(sessionId, project.id, now);
      return;
    }
  }
}

/**
 * Get the project ID bound to a session, if any.
 * Returns null when the session has not been bound to any project.
 */
function getProjectForSession(sessionId: string): string | null {
  const row = sessionProjectBindingQueries.getBySession().get(sessionId) as
    | { project_id: string }
    | undefined;
  return row ? row.project_id : null;
}

// ---------------------------------------------------------------------------
// Agent-Task Binding
// ---------------------------------------------------------------------------

/**
 * Create an active binding between an agent and a PRD task.
 * This allows subsequent events from the same agent to receive a confidence
 * boost towards this task, drastically reducing false-positive task switches.
 */
function bindAgentToTask(
  agentId: string,
  sessionId: string,
  taskId: string,
  confidence: number,
): void {
  agentTaskBindingQueries.bind().run(
    randomUUID(),
    agentId,
    sessionId,
    taskId,
    confidence,
    new Date().toISOString(),
  );
}

/**
 * Get the active (non-expired) agent-task binding for an agent in a session.
 * Returns null when the agent has no active binding.
 */
function getAgentBinding(
  agentId: string,
  sessionId: string,
): { prdTaskId: string; confidence: number } | null {
  const row = agentTaskBindingQueries.getActiveByAgent().get(agentId, sessionId) as
    | { prd_task_id: string; confidence: number }
    | undefined;
  if (!row) return null;
  return { prdTaskId: row.prd_task_id, confidence: row.confidence };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Audit logging
// ---------------------------------------------------------------------------

type LayerName = 'exact_id' | 'subject_match' | 'task_create' |
  'task_update_s1_exact' | 'task_update_s2_subject' | 'task_update_s3_desc' |
  'task_update_s4_binding' | 'task_list_sync';

function logAudit(
  event: AgentEvent,
  taskId: string | null,
  layer: LayerName,
  score: number,
  matched: boolean,
  reason: string,
): void {
  try {
    correlationAuditQueries.insert().run(
      randomUUID(), event.id, taskId, event.sessionId, event.agentId,
      layer, score, matched ? 1 : 0, reason, event.timestamp,
    );
  } catch { /* audit must never break the pipeline */ }
}

// ---------------------------------------------------------------------------
// Task-tool handlers
// ---------------------------------------------------------------------------

function handleTaskCreate(event: AgentEvent, input: Record<string, unknown>): void {
  // Extract ALL fields from TaskCreate input
  const subject = typeof input['subject'] === 'string' ? input['subject'] : '';
  const description = typeof input['description'] === 'string' ? input['description'] : '';
  const priority = typeof input['priority'] === 'string' ? input['priority'] : '';
  const activeForm = typeof input['activeForm'] === 'string' ? input['activeForm'] : '';
  const inputTags = Array.isArray(input['tags'])
    ? (input['tags'] as unknown[]).filter((t): t is string => typeof t === 'string')
    : [];

  // Need at least a subject to match against
  if (!subject) return;

  // Try to extract the Claude Code taskId from the tool output
  let externalId: string | null = null;
  if (event.output) {
    try {
      const output = typeof event.output === 'string' ? JSON.parse(event.output) : event.output;
      externalId = (output as Record<string, unknown>)['taskId'] as string
        ?? (output as Record<string, unknown>)['id'] as string
        ?? null;
    } catch {
      const match = (event.output as string).match(/(?:task|id)[:\s]*["']?([a-f0-9-]{8,})["']?/i);
      if (match) externalId = match[1] ?? null;
    }
  }

  // Also check input for taskId
  if (!externalId) {
    externalId = (typeof input['taskId'] === 'string' ? input['taskId'] : null)
      ?? (typeof input['id'] === 'string' ? input['id'] : null);
  }

  // Store full tool_input for audit (no 500 char truncation)
  const fullInputDetails = JSON.stringify(input);
  const now = new Date().toISOString();

  const projects = projectQueries.getAll().all() as Array<{ id: string }>;

  for (const project of projects) {
    const tasks = prdTaskQueries.getByProject().all(project.id) as PrdTaskRow[];

    let bestMatch: PrdTaskRow | null = null;
    let bestScore = 0;
    let bestReason = '';

    for (const task of tasks) {
      const reasons: string[] = [];

      // Primary: subject vs title using combinedSimilarity
      const titleScore = combinedSimilarity(subject, task.title);
      if (titleScore >= CONFIDENCE_THRESHOLD) reasons.push(`title:${(titleScore * 100).toFixed(0)}%`);

      // Secondary: description vs task description
      let descScore = 0;
      if (description) {
        descScore = combinedSimilarity(description, task.description) * 0.8;
        if (descScore >= CONFIDENCE_THRESHOLD) reasons.push(`desc:${(descScore * 100).toFixed(0)}%`);
      }

      // Tertiary: activeForm vs task title
      let activeFormScore = 0;
      if (activeForm) {
        activeFormScore = combinedSimilarity(activeForm, task.title) * 0.9;
        if (activeFormScore >= CONFIDENCE_THRESHOLD) reasons.push(`activeForm:${(activeFormScore * 100).toFixed(0)}%`);
      }

      // Tag boost: input tags vs PRD task tags
      let tagBonus = 0;
      if (inputTags.length > 0) {
        const taskTags = parseTags(task.tags);
        if (taskTags.length > 0) {
          let tagMatches = 0;
          for (const inputTag of inputTags) {
            const inputTagLower = inputTag.toLowerCase();
            for (const taskTag of taskTags) {
              const taskTagLower = taskTag.toLowerCase();
              if (taskTagLower === inputTagLower || taskTagLower.includes(inputTagLower) || inputTagLower.includes(taskTagLower)) {
                tagMatches++;
                break;
              }
            }
          }
          tagBonus = (tagMatches / Math.max(inputTags.length, taskTags.length)) * 0.15;
          if (tagBonus > 0) reasons.push(`tags:+${(tagBonus * 100).toFixed(0)}%`);
        }
      }

      const score = Math.min(Math.max(titleScore, descScore, activeFormScore) + tagBonus, 1.0);

      // Log every match attempt to correlation audit
      correlationAuditQueries.insert().run(
        randomUUID(), event.id, task.id, event.sessionId, event.agentId,
        'task_create', score, score >= CONFIDENCE_THRESHOLD ? 1 : 0,
        `TaskCreate "${subject}" vs "${task.title}": ${reasons.join(', ') || 'below threshold'}`,
        now
      );

      if (score > bestScore && score >= CONFIDENCE_THRESHOLD) {
        bestMatch = task;
        bestScore = score;
        bestReason = reasons.join(', ');
      }
    }

    if (bestMatch) {
      // Link via external ID and optionally update priority
      const priorityUpdate = ['critical', 'high', 'medium', 'low'].includes(priority) ? priority : null;
      prdTaskQueries.update().run(
        null, priorityUpdate, null, null, externalId,
        null, null, event.sessionId,
        now,
        bestMatch.id
      );

      // Create agent-task binding for the creating agent
      bindAgentToTask(event.agentId, event.sessionId, bestMatch.id, bestScore);

      // Record activity with full input details (no truncation)
      taskActivityQueries.insert().run(
        randomUUID(),
        bestMatch.id,
        event.id,
        event.sessionId,
        event.agentId,
        'task_created',
        event.timestamp,
        `Matched TaskCreate: "${subject}" (confidence: ${(bestScore * 100).toFixed(0)}%, ${bestReason}, externalId: ${externalId ?? 'none'}). Full input: ${fullInputDetails}`
      );

      sseManager.broadcast('correlation_match', {
        eventId: event.id,
        taskId: bestMatch.id,
        confidence: bestScore,
        reason: `TaskCreate match: "${subject}" (${bestReason})`,
      });

      break;
    }
  }
}

function handleTaskUpdate(event: AgentEvent, input: Record<string, unknown>): void {
  const taskId = typeof input['taskId'] === 'string' ? input['taskId'] : '';
  const status = typeof input['status'] === 'string' ? input['status'] : '';
  const owner = typeof input['owner'] === 'string' ? input['owner'] : '';
  const subject = typeof input['subject'] === 'string' ? input['subject'] : '';

  if (!taskId) return;

  const now = new Date().toISOString();
  const projects = projectQueries.getAll().all() as Array<{ id: string }>;

  for (const project of projects) {
    const tasks = prdTaskQueries.getByProject().all(project.id) as PrdTaskRow[];

    // Strategy 1: exact match by external_id
    let matchedTask = tasks.find(t => t.external_id === taskId);
    let matchMethod = 'externalId exact match';
    let confidence = 1.0;

    // Log Strategy 1 attempt
    if (matchedTask) {
      correlationAuditQueries.insert().run(
        randomUUID(), event.id, matchedTask.id, event.sessionId, event.agentId,
        'task_update_s1_exact', 1.0, 1,
        `TaskUpdate exact externalId match: "${taskId}" -> "${matchedTask.title}"`,
        now
      );
    }

    // Strategy 2: similarity match by subject/title (fallback)
    if (!matchedTask && subject) {
      let bestScore = 0;
      for (const task of tasks) {
        if (task.status === 'completed' || task.status === 'deferred') continue;
        const score = combinedSimilarity(subject, task.title);

        // Log each attempt
        correlationAuditQueries.insert().run(
          randomUUID(), event.id, task.id, event.sessionId, event.agentId,
          'task_update_s2_subject', score, score >= CONFIDENCE_THRESHOLD ? 1 : 0,
          `TaskUpdate subject "${subject}" vs "${task.title}": ${(score * 100).toFixed(0)}%`,
          now
        );

        if (score > bestScore && score >= CONFIDENCE_THRESHOLD) {
          matchedTask = task;
          bestScore = score;
        }
      }
      if (matchedTask) {
        confidence = bestScore;
        matchMethod = `subject similarity match: "${subject}" (${(bestScore * 100).toFixed(0)}%)`;

        // Link for future exact matches
        prdTaskQueries.update().run(
          null, null, null, null, taskId,
          null, null, event.sessionId, now,
          matchedTask.id
        );
      }
    }

    // Strategy 3: if we have an activeForm/description, try combinedSimilarity on that
    if (!matchedTask) {
      const activeForm = typeof input['activeForm'] === 'string' ? input['activeForm'] : '';
      const description = typeof input['description'] === 'string' ? input['description'] : '';
      const searchText = activeForm || description || '';
      if (searchText) {
        let bestScore = 0;
        for (const task of tasks) {
          if (task.status === 'completed' || task.status === 'deferred') continue;
          const titleScore = combinedSimilarity(searchText, task.title);
          const descScore = combinedSimilarity(searchText, task.description) * 0.8;
          const score = Math.max(titleScore, descScore);

          // Log each attempt
          correlationAuditQueries.insert().run(
            randomUUID(), event.id, task.id, event.sessionId, event.agentId,
            'task_update_s3_desc', score, score >= CONFIDENCE_THRESHOLD ? 1 : 0,
            `TaskUpdate desc/activeForm "${searchText.slice(0, 80)}" vs "${task.title}": title=${(titleScore * 100).toFixed(0)}% desc=${(descScore * 100).toFixed(0)}%`,
            now
          );

          if (score > bestScore && score >= CONFIDENCE_THRESHOLD) {
            matchedTask = task;
            bestScore = score;
          }
        }
        if (matchedTask) {
          confidence = bestScore;
          matchMethod = `description similarity match (${(bestScore * 100).toFixed(0)}%)`;

          // Link for future exact matches
          prdTaskQueries.update().run(
            null, null, null, null, taskId,
            null, null, event.sessionId, now,
            matchedTask.id
          );
        }
      }
    }

    // Strategy 4: check agent-task bindings for existing binding by owner
    if (!matchedTask && owner) {
      const binding = getAgentBinding(owner, event.sessionId);
      if (binding) {
        const boundTask = tasks.find(t => t.id === binding.prdTaskId);
        if (boundTask && boundTask.status !== 'completed' && boundTask.status !== 'deferred') {
          matchedTask = boundTask;
          confidence = binding.confidence;
          matchMethod = `agent-task binding for owner "${owner}" (confidence: ${(binding.confidence * 100).toFixed(0)}%)`;

          // Log Strategy 4
          correlationAuditQueries.insert().run(
            randomUUID(), event.id, boundTask.id, event.sessionId, event.agentId,
            'task_update_s4_binding', binding.confidence, 1,
            `TaskUpdate matched via agent-task binding: owner="${owner}" -> "${boundTask.title}"`,
            now
          );
        }
      }
    }

    if (!matchedTask) continue;

    const updates: Record<string, string | undefined> = {};

    if (status === 'in_progress') {
      updates['status'] = 'in_progress';
    } else if (status === 'completed') {
      updates['status'] = 'completed';
    } else if (status === 'pending') {
      updates['status'] = 'pending';
    }

    if (owner) {
      updates['assignedAgent'] = owner;
    }

    if (Object.keys(updates).length > 0 && !isBacklogSprintTask(matchedTask)) {
      updateTask(matchedTask.id, updates);
    }

    // --- Agent-Task binding management ---
    if (status === 'in_progress') {
      bindAgentToTask(event.agentId, event.sessionId, matchedTask.id, confidence);
    }
    if (owner) {
      bindAgentToTask(owner, event.sessionId, matchedTask.id, confidence);
    }
    if (status === 'completed') {
      agentTaskBindingQueries.expire().run(now, event.agentId, event.sessionId);
    }

    // Record activity with full input details
    const activityType = status === 'completed' ? 'task_completed'
                       : status === 'in_progress' ? 'task_started'
                       : owner ? 'agent_assigned'
                       : 'manual_update';

    taskActivityQueries.insert().run(
      randomUUID(),
      matchedTask.id,
      event.id,
      event.sessionId,
      event.agentId,
      activityType,
      event.timestamp,
      `TaskUpdate: status=${status || 'unchanged'}, owner=${owner || 'unchanged'} (${matchMethod}). Full input: ${JSON.stringify(input)}`
    );

    sseManager.broadcast('correlation_match', {
      eventId: event.id,
      taskId: matchedTask.id,
      confidence,
      reason: `TaskUpdate ${matchMethod}`,
    });

    break;
  }
}

// ---------------------------------------------------------------------------
// TaskList bulk reconciliation handler
// ---------------------------------------------------------------------------

/**
 * Parse and reconcile a TaskList response against PRD tasks.
 *
 * TaskList returns the full list of Claude Code tasks. We parse each entry
 * and try to match it against PRD tasks, updating status and owner when they
 * differ. This provides a periodic "ground truth" sync that corrects drift.
 */
function handleTaskList(event: AgentEvent): void {
  const rawOutput = event.output;
  if (!rawOutput) return;

  const now = new Date().toISOString();

  // Shape of a task entry from Claude Code's TaskList output
  interface ClaudeTask {
    id?: string;
    subject?: string;
    status?: string;
    owner?: string;
    blockedBy?: string[];
  }

  let claudeTasks: ClaudeTask[] = [];

  // Try JSON parse first (structured output)
  try {
    const parsed = JSON.parse(rawOutput);
    if (Array.isArray(parsed)) {
      claudeTasks = parsed as ClaudeTask[];
    } else if (typeof parsed === 'object' && parsed !== null) {
      // Might be wrapped in { tasks: [...] } or { result: [...] }
      const wrapped = parsed as Record<string, unknown>;
      const inner = wrapped['tasks'] ?? wrapped['result'] ?? wrapped['data'];
      if (Array.isArray(inner)) {
        claudeTasks = inner as ClaudeTask[];
      }
    }
  } catch {
    // Not JSON - try line-by-line text parsing
    const lines = rawOutput.split('\n').filter(l => l.trim().length > 0);
    for (const line of lines) {
      const trimmed = line.trim();

      // Pattern: "[status] subject (owner: name)"
      const bracketMatch = trimmed.match(/\[(\w+)\]\s+(.+?)(?:\s*\(owner:\s*(.+?)\))?$/);
      if (bracketMatch) {
        claudeTasks.push({
          status: bracketMatch[1],
          subject: bracketMatch[2]?.trim(),
          owner: bracketMatch[3]?.trim(),
        });
        continue;
      }

      // Pattern: "N. subject - status"
      const numberedMatch = trimmed.match(/^\d+\.\s+(.+?)\s*[-|]\s*(\w+)(?:\s*[-|]\s*(.+))?$/);
      if (numberedMatch) {
        claudeTasks.push({
          subject: numberedMatch[1]?.trim(),
          status: numberedMatch[2]?.trim(),
          owner: numberedMatch[3]?.trim(),
        });
        continue;
      }
    }
  }

  if (claudeTasks.length === 0) return;

  // Map Claude Code status strings to PRD task status
  const STATUS_MAP: Record<string, string> = {
    'pending': 'pending',
    'in_progress': 'in_progress',
    'in-progress': 'in_progress',
    'inprogress': 'in_progress',
    'completed': 'completed',
    'done': 'completed',
    'blocked': 'blocked',
    'cancelled': 'deferred',
    'canceled': 'deferred',
  };

  const statusOrder = ['backlog', 'planned', 'pending', 'in_progress', 'in_review', 'completed'];

  const projects = projectQueries.getAll().all() as Array<{ id: string }>;

  for (const project of projects) {
    const prdTasks = prdTaskQueries.getByProject().all(project.id) as PrdTaskRow[];
    if (prdTasks.length === 0) continue;

    let matchCount = 0;

    for (const claudeTask of claudeTasks) {
      const taskSubject = claudeTask.subject ?? '';
      const claudeTaskId = claudeTask.id ?? '';
      if (!taskSubject && !claudeTaskId) continue;

      let matchedPrdTask: PrdTaskRow | undefined;
      let matchScore = 0;
      let matchReason = '';

      // Try 1: exact match by external_id
      if (claudeTaskId) {
        matchedPrdTask = prdTasks.find(t => t.external_id === claudeTaskId);
        if (matchedPrdTask) {
          matchScore = 1.0;
          matchReason = `externalId exact: "${claudeTaskId}"`;
        }
      }

      // Try 2: match by subject vs title using combinedSimilarity
      if (!matchedPrdTask && taskSubject) {
        let bestScore = 0;
        for (const prdTask of prdTasks) {
          const score = combinedSimilarity(taskSubject, prdTask.title);
          if (score > bestScore && score >= CONFIDENCE_THRESHOLD) {
            matchedPrdTask = prdTask;
            bestScore = score;
          }
        }
        if (matchedPrdTask) {
          matchScore = bestScore;
          matchReason = `subject similarity: "${taskSubject}" -> "${matchedPrdTask.title}" (${(bestScore * 100).toFixed(0)}%)`;
        }
      }

      // Log the match attempt to correlation audit
      correlationAuditQueries.insert().run(
        randomUUID(),
        event.id,
        matchedPrdTask?.id ?? null,
        event.sessionId,
        event.agentId,
        'task_list_sync',
        matchScore,
        matchedPrdTask ? 1 : 0,
        `TaskList sync: "${taskSubject || claudeTaskId}" ${matchedPrdTask ? `-> "${matchedPrdTask.title}" (${matchReason})` : '(no match)'}`,
        now
      );

      if (!matchedPrdTask) continue;
      matchCount++;

      // Reconcile status and owner
      const claudeStatus = claudeTask.status ? STATUS_MAP[claudeTask.status.toLowerCase()] : undefined;
      const updates: Record<string, string | undefined> = {};
      let hasChanges = false;

      if (claudeStatus && claudeStatus !== matchedPrdTask.status) {
        const currentIdx = statusOrder.indexOf(matchedPrdTask.status);
        const newIdx = statusOrder.indexOf(claudeStatus);
        // Don't regress, but allow 'blocked' transitions
        if (matchedPrdTask.status !== 'blocked' && (newIdx > currentIdx || claudeStatus === 'blocked')) {
          updates['status'] = claudeStatus;
          hasChanges = true;
        }
      }

      if (claudeTask.owner && claudeTask.owner !== matchedPrdTask.assigned_agent) {
        updates['assignedAgent'] = claudeTask.owner;
        hasChanges = true;
      }

      if (hasChanges && !isBacklogSprintTask(matchedPrdTask)) {
        updateTask(matchedPrdTask.id, updates);

        const activityType = updates['status'] === 'completed' ? 'task_completed'
                           : updates['status'] === 'in_progress' ? 'task_started'
                           : updates['assignedAgent'] ? 'agent_assigned'
                           : 'manual_update';

        taskActivityQueries.insert().run(
          randomUUID(),
          matchedPrdTask.id,
          event.id,
          event.sessionId,
          event.agentId,
          activityType,
          event.timestamp,
          `TaskList sync: status=${updates['status'] ?? 'unchanged'}, owner=${updates['assignedAgent'] ?? 'unchanged'} (${matchReason})`
        );

        sseManager.broadcast('task_status_changed', {
          taskId: matchedPrdTask.id,
          oldStatus: matchedPrdTask.status,
          newStatus: updates['status'] ?? matchedPrdTask.status,
          agent: updates['assignedAgent'] ?? matchedPrdTask.assigned_agent,
          source: 'task_list_sync',
        });
      }
    }

    // If we matched tasks in this project, no need to check other projects
    if (matchCount > 0) break;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Correlate an incoming agent event against PRD tasks.
 *
 * This function is called from the event ingestion route after the event has
 * been persisted. It uses an "Explicit-First" approach with only 2 paths:
 *
 * 0. **Session binding** -- On SessionStart, auto-bind the session to a project
 *    based on working directory. This narrows all subsequent matching to the
 *    bound project, eliminating cross-project false positives.
 *
 * 1. **Task-tool correlation** -- When the agent uses TaskCreate / TaskUpdate /
 *    TaskList tools, we link them to PRD tasks by exact external-id match or
 *    by subject/title similarity. This is the GOLD path for auto-completing
 *    tasks (TaskUpdate with status=completed).
 *
 * General tool events (Write, Edit, Bash, Read, etc.) are intentionally NOT
 * correlated. They produced too much noise with low-confidence matches.
 * Task status changes should come from explicit signals only.
 */
export function correlateEvent(event: AgentEvent): void {
  try {
    // --- Guard: skip events that can never produce useful correlation ---
    // PreToolUse fires BEFORE the tool runs - no output, no result to correlate.
    // Only PostToolUse has the complete picture (input + output + duration).
    if (event.hookType === 'PreToolUse') return;

    // Skip lifecycle events that have no tool context
    if (event.hookType === 'Notification' || event.hookType === 'PreCompact' ||
        event.hookType === 'PostCompact' || event.hookType === 'SubagentStop') return;

    // Skip events with no meaningful tool name
    if (event.tool === 'unknown' || event.tool === '') return;

    // --- Path 0: Session-Project binding on SessionStart ---
    if (event.hookType === 'SessionStart') {
      const workingDirectory =
        (event.metadata?.['working_directory'] as string) || '';
      if (workingDirectory) {
        bindSessionToProject(event.sessionId, workingDirectory);
      }
      // SessionStart events don't need further correlation
      return;
    }

    // --- Path 1: explicit task tool events (ONLY path for correlation) ---
    if (event.tool && (TASK_TOOLS as readonly string[]).includes(event.tool)) {
      const meta = event.metadata as Record<string, unknown> | undefined;
      if (!meta) return;
      const toolInput = (meta['tool_input'] ?? meta) as Record<string, unknown>;

      if (event.tool === 'TaskCreate') {
        handleTaskCreate(event, toolInput);
      } else if (event.tool === 'TaskUpdate') {
        handleTaskUpdate(event, toolInput);
      } else if (event.tool === 'TaskList' && event.hookType === 'PostToolUse') {
        handleTaskList(event);
      }
      return;
    }

    // General tool events (Write, Edit, Bash, Read, etc.) are intentionally
    // NOT correlated. The removed handleGeneralToolEvent() was the main
    // source of noise with low-confidence fuzzy matches.
  } catch {
    // Correlation errors should never break event processing
  }
}
