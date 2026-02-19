import { Router } from 'express';
import type { Request, Response } from 'express';
import { createProjectRequestSchema } from '@claudecam/shared';
import {
  createProject,
  getProject,
  listProjects,
  deleteProject,
  listSprints,
} from '../services/project-manager.js';

export const projectsRouter = Router();

// POST /api/projects - Create a project from a PRD
projectsRouter.post('/', (req: Request, res: Response) => {
  try {
    const parsed = createProjectRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      return;
    }

    const { name, prd_content, parse_method } = parsed.data;
    const result = createProject(name, prd_content, parse_method);

    res.status(201).json({
      project: {
        id: result.project.id,
        name: result.project.name,
        totalTasks: result.tasks.length,
        sprints: result.sprints.map(s => ({
          id: s.id,
          name: s.name,
          taskCount: s.totalTasks,
        })),
      },
      tasks_preview: result.tasks.slice(0, 20).map(t => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        complexity: t.complexity,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/projects - List all projects
projectsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const projects = listProjects();
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/projects/:id - Get project details with stats
projectsRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const projectId = String(req.params['id']);
    const project = getProject(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const sprints = listSprints(project.id);
    const currentSprint = sprints.find(s => s.id === project.currentSprintId);
    const completionPercent = project.totalTasks > 0
      ? Math.round((project.completedTasks / project.totalTasks) * 1000) / 10
      : 0;

    res.json({
      project: {
        ...project,
        completionPercent,
        currentSprint: currentSprint ? {
          id: currentSprint.id,
          name: currentSprint.name,
          totalTasks: currentSprint.totalTasks,
          completedTasks: currentSprint.completedTasks,
          completionPercent: currentSprint.totalTasks > 0
            ? Math.round((currentSprint.completedTasks / currentSprint.totalTasks) * 1000) / 10
            : 0,
        } : undefined,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/projects/:id
projectsRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = deleteProject(String(req.params['id']));
    if (!deleted) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
