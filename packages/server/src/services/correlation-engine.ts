import { randomUUID } from 'node:crypto';
import type { AgentEvent } from '@cam/shared';
import { TASK_TOOLS, FILE_CHANGE_TOOLS, FILE_READ_TOOLS, COMMAND_TOOLS } from '@cam/shared';
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
import { combinedSimilarity, tokenSimilarity, tokenize } from './string-similarity.js';

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

interface CorrelationMatch {
  taskId: string;
  projectId: string;
  confidence: number;
  reason: string;
}

// Minimum confidence threshold for a match to trigger a status update
const CONFIDENCE_THRESHOLD = 0.6;

// Bonus applied to the score of a task that has an active agent-task binding.
// This makes subsequent events from the same agent strongly prefer the
// task it was already assigned to, reducing false-positive switches.
const AGENT_BINDING_BOOST = 0.3;

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
// Matching helpers
// ---------------------------------------------------------------------------

/**
 * Score how well a file path matches a set of tag strings.
 *
 * Tags typically contain short descriptors like "auth", "database", "api",
 * "frontend", "ui", etc.  A file path like `src/services/auth-handler.ts`
 * should strongly match the tag "auth".
 */
function filePathMatchesTags(filePath: string, tags: string[]): number {
  if (!filePath || tags.length === 0) return 0;

  // Normalise path segments: split on separators, strip extensions
  const pathLower = filePath.toLowerCase();
  const segments = pathLower
    .replace(/\\/g, '/')
    .split('/')
    .flatMap(s => s.replace(/\.[^.]+$/, '').split(/[\-_.\s]+/))
    .filter(s => s.length >= 2);

  if (segments.length === 0) return 0;

  let matched = 0;
  for (const tag of tags) {
    const tagLower = tag.toLowerCase();
    // Check if any path segment contains the tag or vice-versa
    for (const seg of segments) {
      if (seg.includes(tagLower) || tagLower.includes(seg)) {
        matched++;
        break;
      }
    }
  }

  return matched / tags.length;
}

/**
 * Map a tool name to a conceptual category of work for matching purposes.
 *   - Write / Edit / NotebookEdit  -> "implementation"
 *   - Read / Glob / Grep           -> "research"
 *   - Bash                         -> "command" (could be tests, builds, etc.)
 */
type ToolCategory = 'implementation' | 'research' | 'command' | 'task' | 'other';

function toolCategory(toolName: string | undefined): ToolCategory {
  if (!toolName) return 'other';
  if ((FILE_CHANGE_TOOLS as readonly string[]).includes(toolName)) return 'implementation';
  if ((FILE_READ_TOOLS as readonly string[]).includes(toolName)) return 'research';
  if ((COMMAND_TOOLS as readonly string[]).includes(toolName)) return 'command';
  if ((TASK_TOOLS as readonly string[]).includes(toolName)) return 'task';
  return 'other';
}

/**
 * Return a small bonus score when the tool category aligns with the nature
 * of a task.  For instance, an "implementation" tool being used likely
 * means the agent is coding, which is relevant to most implementation tasks.
 *
 * We keep this modest (max 0.15) so it acts as a tie-breaker rather than
 * overriding actual content matching.
 */
function toolCategoryBonus(category: ToolCategory, taskTitle: string): number {
  const titleLower = taskTitle.toLowerCase();
  if (category === 'implementation') {
    // Implementation tasks typically mention: implement, create, build, add, write, develop, setup, set up
    const implKeywords = ['implement', 'create', 'build', 'add', 'write', 'develop', 'setup', 'set up', 'design', 'refactor'];
    if (implKeywords.some(k => titleLower.includes(k))) return 0.15;
    return 0.05; // small generic boost for any write operation
  }
  if (category === 'command') {
    // Command tasks often involve testing, deployment, CI
    const cmdKeywords = ['test', 'deploy', 'build', 'ci', 'lint', 'format', 'run', 'script', 'migrate'];
    if (cmdKeywords.some(k => titleLower.includes(k))) return 0.15;
    return 0.0;
  }
  return 0.0;
}

// ---------------------------------------------------------------------------
// Extract useful text from event data
// ---------------------------------------------------------------------------

function extractFilePath(event: AgentEvent): string | undefined {
  if (event.filePath) return event.filePath;

  const meta = event.metadata as Record<string, unknown> | undefined;
  if (!meta) return undefined;

  const toolInput = (meta['tool_input'] ?? meta) as Record<string, unknown>;
  if (typeof toolInput !== 'object' || toolInput === null) return undefined;

  const path = toolInput['file_path'] ?? toolInput['path'] ?? toolInput['filePath'];
  return typeof path === 'string' ? path : undefined;
}

function extractKeywords(event: AgentEvent): string[] {
  const keywords: string[] = [];

  // Pull subject or description from metadata
  const meta = event.metadata as Record<string, unknown> | undefined;
  if (meta) {
    const toolInput = (meta['tool_input'] ?? meta) as Record<string, unknown>;
    if (typeof toolInput === 'object' && toolInput !== null) {
      const subject = toolInput['subject'];
      if (typeof subject === 'string') keywords.push(subject);

      const command = toolInput['command'];
      if (typeof command === 'string') keywords.push(command);

      const content = toolInput['content'];
      if (typeof content === 'string' && content.length < 500) keywords.push(content);
    }
  }

  // Input text (already truncated by event-processor)
  if (event.input && event.input.length < 500) {
    keywords.push(event.input);
  }

  return keywords;
}

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
// Core matching logic
// ---------------------------------------------------------------------------

/**
 * @deprecated Use findBestMatchV2() instead. Kept for reference.
 * Try to match a single event against all PRD tasks across all projects.
 * Returns the best match (if any) above CONFIDENCE_THRESHOLD.
 */
function findBestMatchLegacy(event: AgentEvent): CorrelationMatch | null {
  const filePath = extractFilePath(event);
  const keywords = extractKeywords(event);
  const category = toolCategory(event.tool);

  // Short-circuit: if we have nothing to match on, bail out early
  if (!filePath && keywords.length === 0 && category === 'other') return null;

  const projects = projectQueries.getAll().all() as Array<{ id: string }>;
  if (projects.length === 0) return null;

  let bestMatch: CorrelationMatch | null = null;

  for (const project of projects) {
    const tasks = prdTaskQueries.getByProject().all(project.id) as PrdTaskRow[];

    for (const task of tasks) {
      // Skip tasks that are already completed or deferred
      if (task.status === 'completed' || task.status === 'deferred') continue;

      let score = 0;
      const reasons: string[] = [];
      const tags = parseTags(task.tags);

      // 1) File path vs tags matching (weight: up to 0.5)
      if (filePath && tags.length > 0) {
        const tagScore = filePathMatchesTags(filePath, tags);
        if (tagScore > 0) {
          score += tagScore * 0.5;
          reasons.push(`file-path/tags match (${(tagScore * 100).toFixed(0)}%)`);
        }
      }

      // 2) File path vs task title matching (weight: up to 0.3)
      if (filePath) {
        const pathBasename = filePath.replace(/\\/g, '/').split('/').pop() ?? '';
        const titleScore = combinedSimilarity(pathBasename, task.title);
        if (titleScore > 0) {
          score += titleScore * 0.3;
          reasons.push(`file-path/title match (${(titleScore * 100).toFixed(0)}%)`);
        }
      }

      // 3) Keywords vs task title + description matching (weight: up to 0.4)
      if (keywords.length > 0) {
        let bestKeywordScore = 0;
        for (const kw of keywords) {
          const titleMatch = combinedSimilarity(kw, task.title);
          const descMatch = combinedSimilarity(kw, task.description);
          const kwScore = Math.max(titleMatch, descMatch * 0.8);
          if (kwScore > bestKeywordScore) bestKeywordScore = kwScore;
        }
        if (bestKeywordScore > 0) {
          score += bestKeywordScore * 0.4;
          reasons.push(`keyword/title match (${(bestKeywordScore * 100).toFixed(0)}%)`);
        }
      }

      // 4) Tool category bonus (weight: up to 0.15)
      const catBonus = toolCategoryBonus(category, task.title);
      if (catBonus > 0) {
        score += catBonus;
        reasons.push(`tool-category bonus (${category})`);
      }

      // Clamp to 1.0
      if (score > 1.0) score = 1.0;

      if (score >= CONFIDENCE_THRESHOLD && (bestMatch === null || score > bestMatch.confidence)) {
        bestMatch = {
          taskId: task.id,
          projectId: task.project_id,
          confidence: score,
          reason: reasons.join('; '),
        };
      }
    }
  }

  return bestMatch;
}

// ---------------------------------------------------------------------------
// New matching logic with session-project and agent-task bindings
// ---------------------------------------------------------------------------

/**
 * Try to match a single event against PRD tasks, using binding context
 * to narrow the search space and boost scores.
 *
 * Improvements over the legacy matcher:
 * 1. If the session is bound to a project, only tasks from that project
 *    are considered (eliminates cross-project false positives).
 * 2. If the agent has an active task binding, that task receives a
 *    confidence boost of +0.3, making it strongly preferred.
 */
function findBestMatch(event: AgentEvent): CorrelationMatch | null {
  const filePath = extractFilePath(event);
  const keywords = extractKeywords(event);
  const category = toolCategory(event.tool);

  // Short-circuit: if we have nothing to match on, bail out early
  if (!filePath && keywords.length === 0 && category === 'other') return null;

  // Step 1: Determine which projects to search
  const boundProjectId = getProjectForSession(event.sessionId);
  let projectIds: string[];

  if (boundProjectId) {
    // Session is bound -- only search the bound project
    projectIds = [boundProjectId];
  } else {
    // No binding -- search all projects (legacy behaviour)
    const projects = projectQueries.getAll().all() as Array<{ id: string }>;
    if (projects.length === 0) return null;
    projectIds = projects.map(p => p.id);
  }

  // Step 2: Check for an active agent-task binding
  const agentBinding = getAgentBinding(event.agentId, event.sessionId);

  let bestMatch: CorrelationMatch | null = null;

  for (const projectId of projectIds) {
    const tasks = prdTaskQueries.getByProject().all(projectId) as PrdTaskRow[];

    for (const task of tasks) {
      // Skip tasks that are already completed or deferred
      if (task.status === 'completed' || task.status === 'deferred') continue;

      let score = 0;
      const reasons: string[] = [];
      const tags = parseTags(task.tags);

      // 1) File path vs tags matching (weight: up to 0.5)
      if (filePath && tags.length > 0) {
        const tagScore = filePathMatchesTags(filePath, tags);
        if (tagScore > 0) {
          score += tagScore * 0.5;
          reasons.push(`file-path/tags match (${(tagScore * 100).toFixed(0)}%)`);
        }
      }

      // 2) File path vs task title matching (weight: up to 0.3)
      if (filePath) {
        const pathBasename = filePath.replace(/\\/g, '/').split('/').pop() ?? '';
        const titleScore = combinedSimilarity(pathBasename, task.title);
        if (titleScore > 0) {
          score += titleScore * 0.3;
          reasons.push(`file-path/title match (${(titleScore * 100).toFixed(0)}%)`);
        }
      }

      // 3) Keywords vs task title + description matching (weight: up to 0.4)
      if (keywords.length > 0) {
        let bestKeywordScore = 0;
        for (const kw of keywords) {
          const titleMatch = combinedSimilarity(kw, task.title);
          const descMatch = combinedSimilarity(kw, task.description);
          const kwScore = Math.max(titleMatch, descMatch * 0.8);
          if (kwScore > bestKeywordScore) bestKeywordScore = kwScore;
        }
        if (bestKeywordScore > 0) {
          score += bestKeywordScore * 0.4;
          reasons.push(`keyword/title match (${(bestKeywordScore * 100).toFixed(0)}%)`);
        }
      }

      // 4) Tool category bonus (weight: up to 0.15)
      const catBonus = toolCategoryBonus(category, task.title);
      if (catBonus > 0) {
        score += catBonus;
        reasons.push(`tool-category bonus (${category})`);
      }

      // 5) Agent-task binding boost: if this agent is already bound to this
      //    task, add a significant confidence boost (+0.3). This ensures that
      //    once an agent starts working on a task, subsequent tool calls from
      //    that same agent stay associated with the same task.
      if (agentBinding && agentBinding.prdTaskId === task.id) {
        score += AGENT_BINDING_BOOST;
        reasons.push(`agent-task binding boost (+${(AGENT_BINDING_BOOST * 100).toFixed(0)}%)`);
      }

      // Clamp to 1.0
      if (score > 1.0) score = 1.0;

      if (score >= CONFIDENCE_THRESHOLD && (bestMatch === null || score > bestMatch.confidence)) {
        bestMatch = {
          taskId: task.id,
          projectId: task.project_id,
          confidence: score,
          reason: reasons.join('; '),
        };
      }
    }
  }

  return bestMatch;
}

// ---------------------------------------------------------------------------
// V2: 5-layer hierarchical matching pipeline with audit logging
// ---------------------------------------------------------------------------

type LayerName = 'exact_id' | 'tag_match' | 'file_path' | 'title_similarity' | 'keyword_overlap';

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

const CAM_TASK_REF_RE = /\[CAM:([a-f0-9-]{8,})\]/i;

function extractCamTaskRef(text: string | undefined): string | null {
  if (!text) return null;
  const m = text.match(CAM_TASK_REF_RE);
  return m?.[1] ?? null;
}

function loadCandidateTasks(projectId?: string): PrdTaskRow[] {
  if (projectId) {
    return prdTaskQueries.getByProject().all(projectId) as PrdTaskRow[];
  }
  const projects = projectQueries.getAll().all() as Array<{ id: string }>;
  const allTasks: PrdTaskRow[] = [];
  for (const p of projects) {
    allTasks.push(...(prdTaskQueries.getByProject().all(p.id) as PrdTaskRow[]));
  }
  return allTasks;
}

function isExcluded(task: PrdTaskRow): boolean {
  return task.status === 'completed' || task.status === 'deferred';
}

function extractTokenSet(texts: string[]): Set<string> {
  const tokens = new Set<string>();
  for (const text of texts) {
    if (!text) continue;
    for (const token of tokenize(text)) {
      tokens.add(token);
    }
  }
  return tokens;
}

function findBestMatchV2(event: AgentEvent, projectId?: string): CorrelationMatch | null {
  const resolvedProjectId = projectId ?? getProjectForSession(event.sessionId) ?? undefined;
  const tasks = loadCandidateTasks(resolvedProjectId);
  if (tasks.length === 0) return null;

  const filePath = extractFilePath(event);
  const keywords = extractKeywords(event);
  const category = toolCategory(event.tool);
  if (!filePath && keywords.length === 0 && category === 'other') return null;

  const camRef = extractCamTaskRef(event.input) ?? extractCamTaskRef(event.output);
  const meta = event.metadata as Record<string, unknown> | undefined;
  const evtToolInput = meta ? (meta['tool_input'] ?? meta) as Record<string, unknown> : undefined;
  const eventExternalId = (evtToolInput?.['taskId'] ?? evtToolInput?.['id'] ?? evtToolInput?.['external_id']) as string | undefined;
  const eventSubject = evtToolInput?.['subject'] as string | undefined;

  // --- Layer 1: Exact ID Match (confidence = 1.0) ---
  {
    const layerName: LayerName = 'exact_id';
    for (const task of tasks) {
      if (isExcluded(task)) continue;
      let exactMatch = false;
      let reason = '';

      if (camRef && (camRef === task.id || camRef === task.external_id)) {
        exactMatch = true;
        reason = `CAM reference [CAM:${camRef}] matches task`;
      }
      if (!exactMatch && eventExternalId && task.external_id && eventExternalId === task.external_id) {
        exactMatch = true;
        reason = `external_id "${eventExternalId}" exact match`;
      }
      if (!exactMatch && eventExternalId && eventExternalId === task.id) {
        exactMatch = true;
        reason = `external_id "${eventExternalId}" matches task.id directly`;
      }

      if (exactMatch) {
        logAudit(event, task.id, layerName, 1.0, true, reason);
        return { taskId: task.id, projectId: task.project_id, confidence: 1.0, reason: `[L1:exact_id] ${reason}` };
      }
    }
    logAudit(event, null, layerName, 0, false, 'No exact ID match found');
  }

  // --- Layer 2: Tag Match via combinedSimilarity (confidence = 0.85-0.95) ---
  {
    const layerName: LayerName = 'tag_match';
    const subjectText = eventSubject ?? (keywords.length > 0 ? keywords[0] : undefined);
    if (subjectText) {
      let bestScore = 0;
      let bestTask: PrdTaskRow | null = null;
      for (const task of tasks) {
        if (isExcluded(task)) continue;
        const score = combinedSimilarity(subjectText, task.title);
        if (score > bestScore) { bestScore = score; bestTask = task; }
      }
      if (bestTask && bestScore > 0.85) {
        const reason = `subject/title similarity ${(bestScore * 100).toFixed(0)}% ("${subjectText.slice(0, 80)}" ~ "${bestTask.title.slice(0, 80)}")`;
        logAudit(event, bestTask.id, layerName, bestScore, true, reason);
        return { taskId: bestTask.id, projectId: bestTask.project_id, confidence: bestScore, reason: `[L2:tag_match] ${reason}` };
      }
      logAudit(event, bestTask?.id ?? null, layerName, bestScore, false,
        bestTask ? `Best score ${(bestScore * 100).toFixed(0)}% below 0.85 threshold` : 'No candidates available');
    } else {
      logAudit(event, null, layerName, 0, false, 'No subject/keyword text available for tag match');
    }
  }

  // --- Layer 3: File Path Domain Match (confidence = 0.7-0.85) ---
  {
    const layerName: LayerName = 'file_path';
    if (filePath) {
      let bestScore = 0;
      let bestTask: PrdTaskRow | null = null;
      let bestReason = '';
      const pathLabel = filePath.replace(/\\/g, '/').split('/').pop()?.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') ?? '';

      for (const task of tasks) {
        if (isExcluded(task)) continue;
        const tags = parseTags(task.tags);
        let taskScore = 0;
        let reason = '';

        const titleScore = combinedSimilarity(pathLabel, task.title);
        if (titleScore > taskScore) { taskScore = titleScore; reason = `file "${pathLabel}" ~ title "${task.title.slice(0, 60)}" (${(titleScore * 100).toFixed(0)}%)`; }

        if (tags.length > 0) {
          for (const tag of tags) {
            const tagScore = combinedSimilarity(pathLabel, tag);
            if (tagScore > taskScore) { taskScore = tagScore; reason = `file "${pathLabel}" ~ tag "${tag}" (${(tagScore * 100).toFixed(0)}%)`; }
          }
          const segmentScore = filePathMatchesTags(filePath, tags);
          if (segmentScore > taskScore) { taskScore = segmentScore; reason = `file path segments match ${(segmentScore * 100).toFixed(0)}% of tags`; }
        }
        if (taskScore > bestScore) { bestScore = taskScore; bestTask = task; bestReason = reason; }
      }

      if (bestTask && bestScore > 0.7) {
        const confidence = Math.min(0.7 + bestScore * 0.15, 0.85);
        logAudit(event, bestTask.id, layerName, confidence, true, bestReason);
        return { taskId: bestTask.id, projectId: bestTask.project_id, confidence, reason: `[L3:file_path] ${bestReason}` };
      }
      logAudit(event, bestTask?.id ?? null, layerName, bestScore, false,
        bestTask ? `Best score ${(bestScore * 100).toFixed(0)}% below 0.7 threshold for "${pathLabel}"` : `No candidates for file "${pathLabel}"`);
    } else {
      logAudit(event, null, layerName, 0, false, 'No file path in event');
    }
  }

  // --- Layer 4: Title Similarity via Jaro-Winkler (confidence = 0.6-0.8) ---
  {
    const layerName: LayerName = 'title_similarity';
    if (keywords.length > 0) {
      let bestScore = 0;
      let bestTask: PrdTaskRow | null = null;
      let bestReason = '';

      for (const task of tasks) {
        if (isExcluded(task)) continue;
        let taskBestScore = 0;
        let kwReason = '';
        for (const kw of keywords) {
          const titleScore = combinedSimilarity(kw, task.title);
          const descScore = combinedSimilarity(kw, task.description) * 0.8;
          const kwScore = Math.max(titleScore, descScore);
          if (kwScore > taskBestScore) {
            taskBestScore = kwScore;
            kwReason = titleScore >= descScore
              ? `kw "${kw.slice(0, 60)}" ~ title "${task.title.slice(0, 60)}" (${(titleScore * 100).toFixed(0)}%)`
              : `kw "${kw.slice(0, 60)}" ~ description (${(descScore * 100).toFixed(0)}%)`;
          }
        }
        const catBonus = toolCategoryBonus(category, task.title);
        const totalScore = Math.min(taskBestScore + catBonus, 1.0);
        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestTask = task;
          bestReason = kwReason + (catBonus > 0 ? ` + ${category} bonus (${(catBonus * 100).toFixed(0)}%)` : '');
        }
      }

      if (bestTask && bestScore > 0.6) {
        const confidence = Math.min(bestScore, 0.8);
        logAudit(event, bestTask.id, layerName, confidence, true, bestReason);
        return { taskId: bestTask.id, projectId: bestTask.project_id, confidence, reason: `[L4:title_similarity] ${bestReason}` };
      }
      logAudit(event, bestTask?.id ?? null, layerName, bestScore, false,
        bestTask ? `Best score ${(bestScore * 100).toFixed(0)}% below 0.6 threshold` : 'No candidates for keyword matching');
    } else {
      logAudit(event, null, layerName, 0, false, 'No keywords extracted from event');
    }
  }

  // --- Layer 5: Keyword Overlap Fallback (confidence = 0.5-0.7) ---
  {
    const layerName: LayerName = 'keyword_overlap';
    const eventTexts: string[] = [...keywords];
    if (filePath) eventTexts.push(filePath);
    if (event.output && event.output.length < 500) eventTexts.push(event.output);
    const eventTokens = extractTokenSet(eventTexts);

    if (eventTokens.size > 0) {
      let bestScore = 0;
      let bestTask: PrdTaskRow | null = null;

      for (const task of tasks) {
        if (isExcluded(task)) continue;
        const taskTexts = [task.title, task.description];
        const taskTags = parseTags(task.tags);
        if (taskTags.length > 0) taskTexts.push(...taskTags);
        const taskTokens = extractTokenSet(taskTexts);
        if (taskTokens.size === 0) continue;

        let matchedTokens = 0;
        for (const eTok of eventTokens) {
          for (const tTok of taskTokens) {
            if (combinedSimilarity(eTok, tTok) > 0.8) { matchedTokens++; break; }
          }
        }
        const overlapRatioEvent = matchedTokens / eventTokens.size;
        const overlapRatioTask = Math.min(matchedTokens / taskTokens.size, 1.0);
        const overlapScore = overlapRatioEvent * 0.6 + overlapRatioTask * 0.4;
        if (overlapScore > bestScore) { bestScore = overlapScore; bestTask = task; }
      }

      if (bestTask && bestScore > 0.3) {
        const confidence = Math.min(0.5 + bestScore * 0.2, 0.7);
        const reason = `token overlap ${(bestScore * 100).toFixed(0)}% (${eventTokens.size} event tokens)`;
        logAudit(event, bestTask.id, layerName, confidence, true, reason);
        return { taskId: bestTask.id, projectId: bestTask.project_id, confidence, reason: `[L5:keyword_overlap] ${reason}` };
      }
      logAudit(event, bestTask?.id ?? null, layerName, bestScore, false,
        `Best overlap ${(bestScore * 100).toFixed(0)}% below threshold (${eventTokens.size} event tokens)`);
    } else {
      logAudit(event, null, layerName, 0, false, 'No tokens extracted from event');
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Status inference
// ---------------------------------------------------------------------------

/**
 * Decide what status the matched task should transition to based on the event.
 *
 * - File write / edit tools          -> in_progress
 * - Bash with test success in output -> completed
 * - Read / Grep / Glob               -> in_progress  (agent researching the task)
 */
function inferTaskStatus(event: AgentEvent): 'in_progress' | 'completed' | null {
  const category = toolCategory(event.tool);

  if (category === 'implementation' || category === 'research') {
    return 'in_progress';
  }

  if (category === 'command') {
    // Check if the command output signals test success
    const output = (event.output ?? '').toLowerCase();
    const testsPass =
      output.includes('tests passed') ||
      output.includes('test passed') ||
      output.includes('all tests pass') ||
      output.includes('0 failed') ||
      /\d+ passing/.test(output) ||
      output.includes('test suites: 0 failed') ||
      output.includes('build succeeded') ||
      output.includes('build successful');

    if (testsPass) return 'completed';

    // If the agent is running commands (e.g. building, testing) it's working
    return 'in_progress';
  }

  return null;
}

// ---------------------------------------------------------------------------
// Task-tool handlers (preserved from original implementation)
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

      // Try 2: fuzzy match by subject vs title using combinedSimilarity
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
// Correlate general tool events against PRD tasks
// ---------------------------------------------------------------------------

function handleGeneralToolEvent(event: AgentEvent): void {
  const match = findBestMatchV2(event);
  if (!match) return;

  const newStatus = inferTaskStatus(event);
  if (!newStatus) return;

  // Fetch the current task to make sure we don't regress status
  const currentTasks = prdTaskQueries.getById().get(match.taskId) as PrdTaskRow | undefined;
  if (!currentTasks) return;

  // Status progression order: never go backwards
  const statusOrder = ['backlog', 'planned', 'pending', 'in_progress', 'in_review', 'completed'];
  const currentIdx = statusOrder.indexOf(currentTasks.status);
  const newIdx = statusOrder.indexOf(newStatus);

  // Skip if the task is blocked or would regress
  if (currentTasks.status === 'blocked') return;
  if (currentIdx >= newIdx) return;

  // Skip backlog sprint tasks - they should not be auto-updated by correlation
  if (isBacklogSprintTask(currentTasks)) return;

  // Apply the update via project-manager (handles sprint/project counts, SSE)
  const updates: Record<string, string | undefined> = {
    status: newStatus,
    assignedAgent: event.agentId,
  };
  updateTask(match.taskId, updates);

  // --- Agent-Task binding management for general tool events ---
  if (newStatus === 'in_progress') {
    // Bind the agent so future events get a confidence boost for this task
    bindAgentToTask(event.agentId, event.sessionId, match.taskId, match.confidence);
  }
  if (newStatus === 'completed') {
    // Expire the binding: agent is free for a new task
    const now = new Date().toISOString();
    agentTaskBindingQueries.expire().run(now, event.agentId, event.sessionId);
  }

  // Record activity
  const activityType = newStatus === 'completed' ? 'task_completed' : 'task_started';

  taskActivityQueries.insert().run(
    randomUUID(),
    match.taskId,
    event.id,
    event.sessionId,
    event.agentId,
    activityType,
    event.timestamp,
    `Auto-correlated: ${match.reason} (confidence: ${(match.confidence * 100).toFixed(0)}%)`
  );

  sseManager.broadcast('correlation_match', {
    eventId: event.id,
    taskId: match.taskId,
    confidence: match.confidence,
    reason: match.reason,
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Correlate an incoming agent event against PRD tasks.
 *
 * This function is called from the event ingestion route after the event has
 * been persisted.  It performs three kinds of correlation:
 *
 * 0. **Session binding** -- On SessionStart, auto-bind the session to a project
 *    based on working directory. This narrows all subsequent matching to the
 *    bound project, eliminating cross-project false positives.
 *
 * 1. **Task-tool correlation** -- When the agent uses TaskCreate / TaskUpdate
 *    tools, we link them to PRD tasks by similarity-matching subject text or by
 *    exact external-id match. Agent-task bindings are created/expired here.
 *
 * 2. **General tool correlation** -- When the agent uses Write, Edit, Bash,
 *    Read, etc., we match the file path and keywords against PRD task titles,
 *    descriptions, and tags.  If confidence exceeds 0.6 the task status is
 *    updated automatically (e.g. pending -> in_progress, in_progress ->
 *    completed when tests pass). Active agent-task bindings boost confidence.
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

    // --- Path 1: explicit task tool events ---
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

    // --- Path 2: general tool events (file changes, commands, reads) ---
    if (event.tool && event.hookType === 'PostToolUse') {
      handleGeneralToolEvent(event);
    }
  } catch {
    // Correlation errors should never break event processing
  }
}
