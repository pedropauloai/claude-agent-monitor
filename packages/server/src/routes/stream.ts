import { Router } from 'express';
import type { Request, Response, Router as RouterType } from 'express';
import { randomUUID } from 'node:crypto';
import { sseManager } from '../services/sse-manager.js';

export const streamRouter: RouterType = Router();

// GET /api/stream - SSE endpoint
// Query params:
//   session_id  - filter events by a single session
//   project_id  - filter events by all sessions in a project
streamRouter.get('/', (req: Request, res: Response) => {
  const clientId = randomUUID();
  const sessionFilter = req.query['session_id'] as string | undefined;
  const projectFilter = req.query['project_id'] as string | undefined;

  // Disable request timeout for SSE connections
  req.setTimeout(0);

  sseManager.addClient(clientId, res, sessionFilter, projectFilter);

  // The SSE manager handles everything from here:
  // - Initial connected event
  // - Heartbeat every 15s
  // - Cleanup on close
});
