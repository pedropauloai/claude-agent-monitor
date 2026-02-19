import { Router } from 'express';
import type { Request, Response } from 'express';
import { createSprintRequestSchema } from '@claudecam/shared';
import {
  listSprints,
  createSprint,
  updateSprint,
  getProject,
} from '../services/project-manager.js';

export const sprintsRouter = Router();

// GET /api/projects/:id/sprints
sprintsRouter.get('/:id/sprints', (req: Request, res: Response) => {
  try {
    const projectId = String(req.params['id']);
    const project = getProject(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const sprints = listSprints(projectId);
    res.json({ sprints });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects/:id/sprints
sprintsRouter.post('/:id/sprints', (req: Request, res: Response) => {
  try {
    const projectId = String(req.params['id']);
    const project = getProject(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const parsed = createSprintRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      return;
    }

    const sprint = createSprint(projectId, parsed.data.name, parsed.data.task_ids);
    res.status(201).json({ sprint });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/projects/:projectId/sprints/:sprintId
sprintsRouter.patch('/:projectId/sprints/:sprintId', (req: Request, res: Response) => {
  try {
    const sprintId = String(req.params['sprintId']);
    const updates = req.body as {
      name?: string;
      status?: string;
      description?: string;
    };

    const sprint = updateSprint(sprintId, updates);
    if (!sprint) {
      res.status(404).json({ error: 'Sprint not found' });
      return;
    }

    res.json({ sprint });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
