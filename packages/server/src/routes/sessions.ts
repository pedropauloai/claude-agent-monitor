import { Router } from 'express';
import type { Request, Response } from 'express';
import { DEFAULT_SESSION_LIMIT } from '@claudecam/shared';
import { listSessions, getSession, deleteSession, getSessionWithDetails, listSessionsByProject } from '../services/session-manager.js';
import { sessionQueries, agentQueries } from '../db/queries.js';

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

// PATCH /api/sessions/:id/name - Rename a session
sessionsRouter.patch('/:id/name', (req: Request, res: Response) => {
  try {
    const sessionId = String(req.params['id']);
    const { name } = req.body as { name?: string };

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const trimmedName = name.trim().slice(0, 100);

    const row = sessionQueries.getById().get(sessionId) as Record<string, unknown> | undefined;
    if (!row) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const meta = row['metadata'] ? JSON.parse(row['metadata'] as string) : {};
    meta.name = trimmedName;
    meta.nameSource = 'user';
    sessionQueries.updateMetadata().run(JSON.stringify(meta), sessionId);

    res.json({ ok: true, name: trimmedName });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/sessions/:id/close - Manually close an active session
sessionsRouter.patch('/:id/close', (req: Request, res: Response) => {
  try {
    const sessionId = String(req.params['id']);
    const row = sessionQueries.getById().get(sessionId) as Record<string, unknown> | undefined;
    if (!row) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (row['status'] !== 'active') {
      res.json({ ok: true, status: row['status'] });
      return;
    }

    const now = new Date().toISOString();

    // Mark all active/idle agents as completed
    const agents = agentQueries.getBySession().all(sessionId) as Array<Record<string, unknown>>;
    for (const agent of agents) {
      const s = agent['status'] as string;
      if (s === 'active' || s === 'idle') {
        agentQueries.updateStatus().run('completed', now, agent['id'] as string, sessionId);
      }
    }

    // Mark session as completed
    sessionQueries.updateStatus().run('completed', now, sessionId);

    res.json({ ok: true, status: 'completed' });
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
