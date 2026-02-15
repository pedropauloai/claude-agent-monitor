import { randomUUID } from 'node:crypto';
import type { AgentEvent } from '@cam/shared';
import { TASK_TOOLS, FILE_CHANGE_TOOLS, FILE_READ_TOOLS, COMMAND_TOOLS } from '@cam/shared';
import { prdTaskQueries, taskActivityQueries, projectQueries } from '../db/queries.js';
import { updateTask } from './project-manager.js';
import { sseManager } from './sse-manager.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PrdTaskRow {
  id: string;
  project_id: string;
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

// ---------------------------------------------------------------------------
// Fuzzy / keyword matching helpers
// ---------------------------------------------------------------------------

/**
 * Basic fuzzy string comparison.
 * Returns a score between 0 and 1.
 */
function fuzzyMatch(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  if (aLower === bLower) return 1.0;
  if (aLower.includes(bLower) || bLower.includes(aLower)) return 0.8;

  const aWords = aLower.split(/[\s_\-/\\.:]+/).filter(w => w.length >= 3);
  const bWords = bLower.split(/[\s_\-/\\.:]+/).filter(w => w.length >= 3);

  if (aWords.length === 0 || bWords.length === 0) return 0;

  let matchingWords = 0;
  for (const aw of aWords) {
    for (const bw of bWords) {
      if (bw.includes(aw) || aw.includes(bw)) {
        matchingWords++;
        break;
      }
    }
  }

  const total = Math.max(aWords.length, bWords.length);
  return total === 0 ? 0 : matchingWords / total;
}

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
 * Try to match a single event against all PRD tasks across all projects.
 * Returns the best match (if any) above CONFIDENCE_THRESHOLD.
 */
function findBestMatch(event: AgentEvent): CorrelationMatch | null {
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
        const titleScore = fuzzyMatch(pathBasename, task.title);
        if (titleScore > 0) {
          score += titleScore * 0.3;
          reasons.push(`file-path/title match (${(titleScore * 100).toFixed(0)}%)`);
        }
      }

      // 3) Keywords vs task title + description matching (weight: up to 0.4)
      if (keywords.length > 0) {
        let bestKeywordScore = 0;
        for (const kw of keywords) {
          const titleMatch = fuzzyMatch(kw, task.title);
          const descMatch = fuzzyMatch(kw, task.description);
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
  const subject = (input['subject'] as string) || '';
  if (!subject) return;

  const projects = projectQueries.getAll().all() as Array<{ id: string }>;

  for (const project of projects) {
    const tasks = prdTaskQueries.getByProject().all(project.id) as PrdTaskRow[];

    let bestMatch: PrdTaskRow | null = null;
    let bestScore = 0;

    for (const task of tasks) {
      const score = fuzzyMatch(subject, task.title);
      if (score > bestScore && score >= CONFIDENCE_THRESHOLD) {
        bestMatch = task;
        bestScore = score;
      }
    }

    if (bestMatch) {
      // Link via external ID
      prdTaskQueries.update().run(
        null, null, null, null, event.id,
        null, null, event.sessionId,
        new Date().toISOString(),
        bestMatch.id
      );

      // Record activity
      taskActivityQueries.insert().run(
        randomUUID(),
        bestMatch.id,
        event.id,
        event.sessionId,
        event.agentId,
        'task_created',
        event.timestamp,
        `Matched with TaskCreate: "${subject}" (confidence: ${(bestScore * 100).toFixed(0)}%)`
      );

      sseManager.broadcast('correlation_match', {
        eventId: event.id,
        taskId: bestMatch.id,
        confidence: bestScore,
        reason: `TaskCreate subject fuzzy match: "${subject}"`,
      });

      break;
    }
  }
}

function handleTaskUpdate(event: AgentEvent, input: Record<string, unknown>): void {
  const taskId = input['taskId'] as string;
  const status = input['status'] as string;
  const owner = input['owner'] as string;

  if (!taskId) return;

  const projects = projectQueries.getAll().all() as Array<{ id: string }>;

  for (const project of projects) {
    const tasks = prdTaskQueries.getByProject().all(project.id) as PrdTaskRow[];

    const matchedTask = tasks.find(t => t.external_id === taskId);
    if (!matchedTask) continue;

    const updates: Record<string, string | undefined> = {};

    if (status === 'in_progress') {
      updates['status'] = 'in_progress';
    } else if (status === 'completed') {
      updates['status'] = 'completed';
    }

    if (owner) {
      updates['assignedAgent'] = owner;
    }

    if (Object.keys(updates).length > 0) {
      updateTask(matchedTask.id, updates);
    }

    // Record activity
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
      `TaskUpdate: status=${status || 'unchanged'}, owner=${owner || 'unchanged'}`
    );

    sseManager.broadcast('correlation_match', {
      eventId: event.id,
      taskId: matchedTask.id,
      confidence: 1.0,
      reason: `TaskUpdate externalId exact match`,
    });

    break;
  }
}

// ---------------------------------------------------------------------------
// Correlate general tool events against PRD tasks
// ---------------------------------------------------------------------------

function handleGeneralToolEvent(event: AgentEvent): void {
  const match = findBestMatch(event);
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

  // Apply the update via project-manager (handles sprint/project counts, SSE)
  const updates: Record<string, string | undefined> = {
    status: newStatus,
    assignedAgent: event.agentId,
  };
  updateTask(match.taskId, updates);

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
 * been persisted.  It performs two kinds of correlation:
 *
 * 1. **Task-tool correlation** -- When the agent uses TaskCreate / TaskUpdate
 *    tools, we link them to PRD tasks by fuzzy-matching subject text or by
 *    exact external-id match.
 *
 * 2. **General tool correlation** -- When the agent uses Write, Edit, Bash,
 *    Read, etc., we match the file path and keywords against PRD task titles,
 *    descriptions, and tags.  If confidence exceeds 0.6 the task status is
 *    updated automatically (e.g. pending -> in_progress, in_progress ->
 *    completed when tests pass).
 */
export function correlateEvent(event: AgentEvent): void {
  try {
    // --- Path 1: explicit task tool events ---
    if (event.tool && (TASK_TOOLS as readonly string[]).includes(event.tool)) {
      const meta = event.metadata as Record<string, unknown> | undefined;
      if (!meta) return;
      const toolInput = (meta['tool_input'] ?? meta) as Record<string, unknown>;

      if (event.tool === 'TaskCreate') {
        handleTaskCreate(event, toolInput);
      } else if (event.tool === 'TaskUpdate') {
        handleTaskUpdate(event, toolInput);
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
