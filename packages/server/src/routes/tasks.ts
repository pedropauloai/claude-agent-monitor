import { Router } from 'express';
import type { Request, Response } from 'express';
import { updateTaskRequestSchema, createTaskRequestSchema } from '@claudecam/shared';
import {
  listTasks,
  getTask,
  updateTask,
  getTaskStatusSummary,
  getProject,
  createTaskInProject,
  deleteTaskFromProject,
} from '../services/project-manager.js';
import { taskActivityQueries } from '../db/queries.js';
import {
  markPrdTaskCompleted,
  batchCompleteBySection,
  batchCompleteByIds,
  getCompletionStatus,
} from '../services/task-completion.js';

export const tasksRouter = Router();

// GET /api/projects/:id/tasks
tasksRouter.get('/:id/tasks', (req: Request, res: Response) => {
  try {
    const projectId = String(req.params['id']);
    const project = getProject(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const filters = {
      sprintId: req.query['sprint_id'] as string | undefined,
      status: req.query['status'] as string | undefined,
      agent: req.query['agent'] as string | undefined,
      priority: req.query['priority'] as string | undefined,
    };

    const tasks = listTasks(projectId, filters);
    const summary = getTaskStatusSummary(projectId);

    res.json({ tasks, summary });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects/:id/tasks - Create a new task
tasksRouter.post('/:id/tasks', (req: Request, res: Response) => {
  try {
    const projectId = String(req.params['id']);
    const project = getProject(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const parsed = createTaskRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      return;
    }

    const task = createTaskInProject(projectId, {
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status,
      priority: parsed.data.priority,
      complexity: parsed.data.complexity,
      tags: parsed.data.tags,
      sprintId: parsed.data.sprint_id,
      prdSection: parsed.data.prd_section,
      prdSubsection: parsed.data.prd_subsection,
      dependsOn: parsed.data.depends_on,
      externalId: parsed.data.external_id,
    });

    res.status(201).json({ task });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/projects/:id/tasks/:taskId - Delete a task
tasksRouter.delete('/:id/tasks/:taskId', (req: Request, res: Response) => {
  try {
    const taskId = String(req.params['taskId']);
    const deleted = deleteTaskFromProject(taskId);
    if (!deleted) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/projects/:id/tasks/completion-status - Get completion status summary
// NOTE: Must be before /:id/tasks/:taskId routes to avoid "completion-status" matching as taskId
tasksRouter.get('/:id/tasks/completion-status', (req: Request, res: Response) => {
  try {
    const projectId = String(req.params['id']);
    const project = getProject(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const status = getCompletionStatus(projectId);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects/:id/tasks/batch-complete - Batch complete multiple tasks
// NOTE: Must be before /:id/tasks/:taskId routes to avoid "batch-complete" matching as taskId
tasksRouter.post('/:id/tasks/batch-complete', (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const section = typeof body['section'] === 'string' ? body['section'] : undefined;
    const taskIds = Array.isArray(body['taskIds'])
      ? (body['taskIds'] as unknown[]).filter((id): id is string => typeof id === 'string')
      : undefined;

    if (!section && (!taskIds || taskIds.length === 0)) {
      res.status(400).json({ error: 'Must provide either "section" or "taskIds"' });
      return;
    }

    let completedCount = 0;
    let completedIds: string[] = [];

    if (section) {
      completedCount = batchCompleteBySection(section);
    } else if (taskIds) {
      completedIds = batchCompleteByIds(taskIds);
      completedCount = completedIds.length;
    }

    res.json({
      completed: completedCount,
      tasks: completedIds.length > 0 ? completedIds : undefined,
      section: section ?? undefined,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/projects/:projectId/tasks/:taskId
tasksRouter.patch('/:projectId/tasks/:taskId', (req: Request, res: Response) => {
  try {
    const taskId = String(req.params['taskId']);
    const parsed = updateTaskRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      return;
    }

    const updated = updateTask(taskId, parsed.data);
    if (!updated) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json({ task: updated });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/projects/:id/tasks/:taskId/activity
tasksRouter.get('/:id/tasks/:taskId/activity', (req: Request, res: Response) => {
  try {
    const taskId = String(req.params['taskId']);
    const task = getTask(taskId);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const rows = taskActivityQueries.getByTask().all(taskId) as Array<Record<string, unknown>>;
    const activities = rows.map(row => ({
      id: row['id'],
      prdTaskId: row['prd_task_id'],
      eventId: row['event_id'],
      sessionId: row['session_id'],
      agentId: row['agent_id'],
      activityType: row['activity_type'],
      timestamp: row['timestamp'],
      details: row['details'] ?? undefined,
    }));

    res.json({ activities });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects/:id/tasks/:taskId/complete - Manually mark a task as completed
tasksRouter.post('/:id/tasks/:taskId/complete', (req: Request, res: Response) => {
  try {
    const taskId = String(req.params['taskId']);
    const task = getTask(taskId);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const reason = typeof body['reason'] === 'string'
      ? body['reason']
      : 'Manually completed via API';

    const completed = markPrdTaskCompleted(taskId, reason);
    if (!completed) {
      res.status(409).json({ error: 'Task already completed or not found' });
      return;
    }

    const updated = getTask(taskId);
    res.json({ task: updated, reason });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
