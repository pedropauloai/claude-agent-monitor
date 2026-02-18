import { Router } from 'express';
import type { Request, Response } from 'express';
import { DEFAULT_SESSION_LIMIT } from '@cam/shared';
import { listSessions, getSession, deleteSession, getSessionWithDetails, listSessionsByProject } from '../services/session-manager.js';

export const sessionsRouter = Router();

// GET /api/sessions
sessionsRouter.get('/', (req: Request, res: Response) => {
  try {
    const status = req.query['status'] as string | undefined;
    const projectId = req.query['project_id'] as string | undefined;
    const limit = parseInt(req.query['limit'] as string) || DEFAULT_SESSION_LIMIT;
    const offset = parseInt(req.query['offset'] as string) || 0;

    let sessions;
    if (projectId) {
      sessions = listSessionsByProject(projectId, { limit, offset });
    } else {
      sessions = listSessions({ status, limit, offset });
    }
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/sessions/:id
sessionsRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const session = getSessionWithDetails(String(req.params['id']));
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/sessions/:id
sessionsRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = deleteSession(String(req.params['id']));
    if (!deleted) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
