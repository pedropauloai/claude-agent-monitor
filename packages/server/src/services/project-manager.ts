import { randomUUID } from 'node:crypto';
import type { Project, Sprint, PRDTask } from '@claudecam/shared';
import { projectQueries, sprintQueries, prdTaskQueries, prdDocumentQueries } from '../db/queries.js';
import { parsePrd } from './prd-parser.js';
import { sseManager } from './sse-manager.js';

// Row type interfaces
interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  prd_source: string;
  prd_content: string;
  created_at: string;
  updated_at: string;
  status: string;
  total_tasks: number;
  completed_tasks: number;
  current_sprint_id: string | null;
  metadata: string | null;
}

interface SprintRow {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  order: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  total_tasks: number;
  completed_tasks: number;
  metadata: string | null;
}

interface PrdTaskRow {
  id: string;
  project_id: string;
  sprint_id: string | null;
  external_id: string | null;
  title: string;
  description: string;
  acceptance_criteria: string | null;
  status: string;
  priority: string;
  complexity: number | null;
  tags: string | null;
  depends_on: string;
  blocked_by: string;
  assigned_agent: string | null;
  started_at: string | null;
  completed_at: string | null;
  session_id: string | null;
  prd_section: string | null;
  prd_subsection: string | null;
  prd_line_start: number | null;
  prd_line_end: number | null;
  created_at: string;
  updated_at: string;
}

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    prdSource: row.prd_source,
    prdContent: row.prd_content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status as Project['status'],
    totalTasks: row.total_tasks,
    completedTasks: row.completed_tasks,
    currentSprintId: row.current_sprint_id ?? undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  };
}

function rowToSprint(row: SprintRow): Sprint {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description ?? undefined,
    order: row.order,
    status: row.status as Sprint['status'],
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    totalTasks: row.total_tasks,
    completedTasks: row.completed_tasks,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  };
}

function rowToTask(row: PrdTaskRow): PRDTask {
  return {
    id: row.id,
    projectId: row.project_id,
    sprintId: row.sprint_id ?? undefined,
    externalId: row.external_id ?? undefined,
    title: row.title,
    description: row.description,
    acceptanceCriteria: row.acceptance_criteria ? JSON.parse(row.acceptance_criteria) : undefined,
    status: row.status as PRDTask['status'],
    priority: row.priority as PRDTask['priority'],
    complexity: row.complexity ?? undefined,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    dependsOn: JSON.parse(row.depends_on),
    blockedBy: JSON.parse(row.blocked_by),
    assignedAgent: row.assigned_agent ?? undefined,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    sessionId: row.session_id ?? undefined,
    prdSection: row.prd_section ?? undefined,
    prdSubsection: row.prd_subsection ?? undefined,
    prdLineStart: row.prd_line_start ?? undefined,
    prdLineEnd: row.prd_line_end ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// === Project CRUD ===

export function createProject(name: string, prdContent: string, parseMethod: string = 'structured'): { project: Project; tasks: PRDTask[]; sprints: Sprint[] } {
  const now = new Date().toISOString();
  const projectId = randomUUID();

  const parsed = parsePrd(prdContent, parseMethod);

  projectQueries.insert().run(
    projectId, name, null, '', prdContent,
    now, now, 'active', 0, 0, null, null
  );

  // Create sprints
  const sprints: Sprint[] = [];
  const sprintIdMap = new Map<number, string>();

  for (let i = 0; i < parsed.suggestedSprints.length; i++) {
    const ss = parsed.suggestedSprints[i];
    const sprintId = randomUUID();
    sprintIdMap.set(i, sprintId);

    sprintQueries.insert().run(
      sprintId, projectId, ss.name, null, i + 1,
      i === 0 ? 'active' : 'planned',
      i === 0 ? now : null,
      null, ss.taskIndices.length, 0, null
    );

    sprints.push({
      id: sprintId,
      projectId,
      name: ss.name,
      order: i + 1,
      status: i === 0 ? 'active' : 'planned',
      startedAt: i === 0 ? now : undefined,
      totalTasks: ss.taskIndices.length,
      completedTasks: 0,
    });
  }

  // Set first sprint as current
  if (sprints.length > 0) {
    projectQueries.update().run(null, null, null, null, null, sprints[0].id, now, projectId);
  }

  // Create tasks
  const tasks: PRDTask[] = [];
  const taskSprintLookup = new Map<number, string>();

  for (const [sprintIndex, ss] of parsed.suggestedSprints.entries()) {
    const sprintId = sprintIdMap.get(sprintIndex)!;
    for (const taskIndex of ss.taskIndices) {
      taskSprintLookup.set(taskIndex, sprintId);
    }
  }

  for (let i = 0; i < parsed.suggestedTasks.length; i++) {
    const st = parsed.suggestedTasks[i];
    const taskId = randomUUID();
    const sprintId = taskSprintLookup.get(i) ?? null;

    prdTaskQueries.insert().run(
      taskId, projectId, sprintId, null,
      st.title, st.description,
      null,
      sprintId ? 'pending' : 'backlog',
      st.priority, st.complexity,
      st.tags.length > 0 ? JSON.stringify(st.tags) : null,
      JSON.stringify(st.dependsOn), '[]',
      null, null, null, null,
      st.prdSection, null, st.prdLineStart, st.prdLineEnd,
      now, now
    );

    tasks.push({
      id: taskId,
      projectId,
      sprintId: sprintId ?? undefined,
      title: st.title,
      description: st.description,
      status: sprintId ? 'pending' : 'backlog',
      priority: st.priority,
      complexity: st.complexity,
      tags: st.tags.length > 0 ? st.tags : undefined,
      dependsOn: st.dependsOn,
      blockedBy: [],
      prdSection: st.prdSection,
      prdLineStart: st.prdLineStart,
      prdLineEnd: st.prdLineEnd,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Update project task counts
  projectQueries.updateTaskCounts().run(projectId, projectId, now, projectId);

  // Save PRD document
  const docId = randomUUID();
  prdDocumentQueries.insert().run(
    docId, projectId, 1, prdContent,
    JSON.stringify(parsed.sections), now, parseMethod
  );

  const project = getProject(projectId)!;
  return { project, tasks, sprints };
}

export function getProject(id: string): Project | null {
  const row = projectQueries.getById().get(id) as ProjectRow | undefined;
  return row ? rowToProject(row) : null;
}

export function listProjects(): Project[] {
  const rows = projectQueries.getAll().all() as ProjectRow[];
  return rows.map(rowToProject);
}

export function deleteProject(id: string): boolean {
  const result = projectQueries.deleteById().run(id);
  return result.changes > 0;
}

// === Sprint CRUD ===

export function listSprints(projectId: string): Sprint[] {
  const rows = sprintQueries.getByProject().all(projectId) as SprintRow[];
  return rows.map(rowToSprint);
}

export function getSprint(id: string): Sprint | null {
  const row = sprintQueries.getById().get(id) as SprintRow | undefined;
  return row ? rowToSprint(row) : null;
}

export function createSprint(projectId: string, name: string, taskIds?: string[]): Sprint {
  const now = new Date().toISOString();
  const sprintId = randomUUID();
  const nextOrder = (sprintQueries.getNextOrder().get(projectId) as { next_order: number }).next_order;

  sprintQueries.insert().run(
    sprintId, projectId, name, null, nextOrder,
    'planned', null, null, 0, 0, null
  );

  // Assign tasks to sprint if provided
  if (taskIds && taskIds.length > 0) {
    for (const taskId of taskIds) {
      prdTaskQueries.update().run(
        'planned', null, null, sprintId, null, null, null, null, now, taskId
      );
    }
    sprintQueries.updateTaskCounts().run(sprintId, sprintId, sprintId);
  }

  return getSprint(sprintId)!;
}

export function updateSprint(sprintId: string, updates: {
  name?: string;
  status?: string;
  description?: string;
}): Sprint | null {
  const now = new Date().toISOString();
  const current = getSprint(sprintId);
  if (!current) return null;

  sprintQueries.update().run(
    updates.name ?? null,
    updates.description ?? null,
    updates.status ?? null,
    updates.status === 'active' ? now : null,
    updates.status === 'completed' ? now : null,
    null, null,
    sprintId
  );

  sprintQueries.updateTaskCounts().run(sprintId, sprintId, sprintId);

  return getSprint(sprintId);
}

// === PRD Task CRUD ===

export function listTasks(projectId: string, filters?: {
  sprintId?: string;
  status?: string;
  agent?: string;
  priority?: string;
}): PRDTask[] {
  let rows: PrdTaskRow[];

  if (filters?.sprintId) {
    rows = prdTaskQueries.getBySprint().all(filters.sprintId) as PrdTaskRow[];
  } else if (filters?.status) {
    rows = prdTaskQueries.getByProjectAndStatus().all(projectId, filters.status) as PrdTaskRow[];
  } else if (filters?.agent) {
    rows = prdTaskQueries.getByProjectAndAgent().all(projectId, filters.agent) as PrdTaskRow[];
  } else if (filters?.priority) {
    rows = prdTaskQueries.getByProjectAndPriority().all(projectId, filters.priority) as PrdTaskRow[];
  } else {
    rows = prdTaskQueries.getByProject().all(projectId) as PrdTaskRow[];
  }

  return rows.map(rowToTask);
}

export function getTask(id: string): PRDTask | null {
  const row = prdTaskQueries.getById().get(id) as PrdTaskRow | undefined;
  return row ? rowToTask(row) : null;
}

export function updateTask(taskId: string, updates: {
  status?: string;
  priority?: string;
  assignedAgent?: string;
  sprintId?: string;
}): PRDTask | null {
  const now = new Date().toISOString();
  const current = getTask(taskId);
  if (!current) return null;

  const oldStatus = current.status;
  const newStatus = updates.status ?? oldStatus;

  prdTaskQueries.update().run(
    updates.status ?? null,
    updates.priority ?? null,
    updates.assignedAgent ?? null,
    updates.sprintId ?? null,
    null,
    newStatus === 'in_progress' && !current.startedAt ? now : null,
    newStatus === 'completed' && !current.completedAt ? now : null,
    null,
    now,
    taskId
  );

  const updated = getTask(taskId)!;

  // Update sprint + project task counts
  if (updated.sprintId) {
    sprintQueries.updateTaskCounts().run(updated.sprintId, updated.sprintId, updated.sprintId);
  }
  projectQueries.updateTaskCounts().run(updated.projectId, updated.projectId, now, updated.projectId);

  // Broadcast SSE events for Pilar 2
  if (oldStatus !== newStatus) {
    sseManager.broadcast('task_status_changed', {
      taskId,
      oldStatus,
      newStatus,
      agent: updated.assignedAgent,
    });

    const project = getProject(updated.projectId);
    if (project) {
      sseManager.broadcast('project_progress', {
        projectId: project.id,
        completedTasks: project.completedTasks,
        totalTasks: project.totalTasks,
        percent: project.totalTasks > 0 ? Math.round((project.completedTasks / project.totalTasks) * 1000) / 10 : 0,
      });
    }

    if (updated.sprintId) {
      const sprint = getSprint(updated.sprintId);
      if (sprint) {
        sseManager.broadcast('sprint_progress', {
          sprintId: sprint.id,
          completedTasks: sprint.completedTasks,
          totalTasks: sprint.totalTasks,
          percent: sprint.totalTasks > 0 ? Math.round((sprint.completedTasks / sprint.totalTasks) * 1000) / 10 : 0,
        });
      }
    }
  }

  if (updates.assignedAgent && updates.assignedAgent !== current.assignedAgent) {
    sseManager.broadcast('task_assigned', {
      taskId,
      agent: updates.assignedAgent,
    });
  }

  // Check dependency chain when a task is completed
  if (newStatus === 'completed' && oldStatus !== 'completed') {
    checkDependencies(updated.projectId, taskId);
  }

  return updated;
}

// === Dependency Resolution ===

/**
 * When a task is completed, check if any tasks in the same project
 * that depend on it can be unblocked.
 */
function checkDependencies(projectId: string, completedTaskId: string): void {
  const allTasks = prdTaskQueries.getByProject().all(projectId) as PrdTaskRow[];

  for (const task of allTasks) {
    const dependsOn: string[] = JSON.parse(task.depends_on || '[]');
    if (dependsOn.length === 0) continue;

    // Only care about tasks that depend on the just-completed task
    if (!dependsOn.includes(completedTaskId)) continue;

    // Check if ALL dependencies are now completed
    const allDepsCompleted = dependsOn.every((depId) => {
      const depTask = allTasks.find((t) => t.id === depId);
      return depTask?.status === 'completed';
    });

    if (allDepsCompleted && task.status === 'blocked') {
      // Unblock: move to pending
      const now = new Date().toISOString();
      prdTaskQueries.update().run(
        'pending', null, null, null, null,
        null, null, null,
        now,
        task.id
      );

      sseManager.broadcast('task_unblocked', {
        taskId: task.id,
        unblockedBy: completedTaskId,
      });

      sseManager.broadcast('task_status_changed', {
        taskId: task.id,
        oldStatus: 'blocked',
        newStatus: 'pending',
        agent: task.assigned_agent,
      });
    } else if (!allDepsCompleted && task.status !== 'blocked' && task.status !== 'completed' && task.status !== 'deferred') {
      // Block: task has unresolved deps and isn't already in a terminal state
      const unresolved = dependsOn.filter((depId) => {
        const depTask = allTasks.find((t) => t.id === depId);
        return depTask?.status !== 'completed';
      });

      sseManager.broadcast('task_blocked', {
        taskId: task.id,
        blockedBy: unresolved,
        reason: 'dependency',
      });
    }
  }
}

// === Create / Delete Task ===

export function createTaskInProject(projectId: string, data: {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  complexity?: number;
  tags?: string[];
  sprintId?: string;
  prdSection?: string;
  prdSubsection?: string;
  dependsOn?: string[];
  externalId?: string;
}): PRDTask {
  const now = new Date().toISOString();
  const taskId = randomUUID();

  prdTaskQueries.insert().run(
    taskId,
    projectId,
    data.sprintId ?? null,
    data.externalId ?? null,
    data.title,
    data.description ?? '',
    null,
    data.status ?? 'planned',
    data.priority ?? 'medium',
    data.complexity ?? null,
    data.tags && data.tags.length > 0 ? JSON.stringify(data.tags) : null,
    JSON.stringify(data.dependsOn ?? []),
    '[]',
    null,
    null,
    null,
    null,
    data.prdSection ?? null,
    data.prdSubsection ?? null,
    null, null, // prd_line_start, prd_line_end
    now,
    now,
  );

  // Update sprint + project task counts
  if (data.sprintId) {
    sprintQueries.updateTaskCounts().run(data.sprintId, data.sprintId, data.sprintId);
  }
  projectQueries.updateTaskCounts().run(projectId, projectId, now, projectId);

  return getTask(taskId)!;
}

export function deleteTaskFromProject(taskId: string): boolean {
  const task = getTask(taskId);
  if (!task) return false;

  const result = prdTaskQueries.deleteById().run(taskId);

  if (result.changes > 0) {
    const now = new Date().toISOString();
    // Update sprint + project task counts
    if (task.sprintId) {
      sprintQueries.updateTaskCounts().run(task.sprintId, task.sprintId, task.sprintId);
    }
    projectQueries.updateTaskCounts().run(task.projectId, task.projectId, now, task.projectId);
  }

  return result.changes > 0;
}

export function getTaskStatusSummary(projectId: string) {
  const rows = prdTaskQueries.getStatusSummary().all(projectId) as Array<{ status: string; count: number }>;
  const summary: Record<string, number> = {
    total: 0,
    backlog: 0,
    planned: 0,
    pending: 0,
    in_progress: 0,
    in_review: 0,
    completed: 0,
    blocked: 0,
    deferred: 0,
  };
  for (const row of rows) {
    summary[row.status] = row.count;
    summary['total'] += row.count;
  }
  return summary;
}
