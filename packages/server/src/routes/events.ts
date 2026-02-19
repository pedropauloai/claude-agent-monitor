import { Router } from 'express';
import type { Request, Response } from 'express';
import { incomingEventSchema } from '@claudecam/shared';
import { processEvent } from '../services/event-processor.js';
import { correlateEvent } from '../services/correlation-engine.js';
import { eventQueries } from '../db/queries.js';
import { DEFAULT_EVENT_LIMIT } from '@claudecam/shared';

export const eventsRouter = Router();

// POST /api/events - Main event ingestion endpoint
eventsRouter.post('/', (req: Request, res: Response) => {
  try {
    const parsed = incomingEventSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ ok: false, error: 'Invalid event payload', details: parsed.error.issues });
      return;
    }

    const event = processEvent(parsed.data);

    // Run correlation in the background (non-blocking)
    try {
      correlateEvent(event);
    } catch {
      // Correlation errors should not break event ingestion
    }

    res.status(200).json({ ok: true, event_id: event.id });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// GET /api/sessions/:id/events - List events for a session
// Note: This route is mounted on /api/sessions, so the path here is /:id/events
eventsRouter.get('/:id/events', (req: Request, res: Response) => {
  try {
    const sessionId = req.params['id']!;
    const category = req.query['category'] as string | undefined;
    const agentId = req.query['agent_id'] as string | undefined;
    const tool = req.query['tool'] as string | undefined;
    const since = req.query['since'] as string | undefined;
    const limit = parseInt(req.query['limit'] as string) || DEFAULT_EVENT_LIMIT;
    const offset = parseInt(req.query['offset'] as string) || 0;

    let rows;
    if (category && agentId) {
      rows = eventQueries.getByAgentAndCategory().all(sessionId, agentId, category, limit, offset);
    } else if (category) {
      rows = eventQueries.getBySessionAndCategory().all(sessionId, category, limit, offset);
    } else if (agentId) {
      rows = eventQueries.getBySessionAndAgent().all(sessionId, agentId, limit, offset);
    } else if (tool) {
      rows = eventQueries.getBySessionAndTool().all(sessionId, tool, limit, offset);
    } else if (since) {
      rows = eventQueries.getBySessionSince().all(sessionId, since, limit, offset);
    } else {
      rows = eventQueries.getBySession().all(sessionId, limit, offset);
    }

    const events = (rows as Array<Record<string, unknown>>).map(row => ({
      id: row['id'],
      sessionId: row['session_id'],
      agentId: row['agent_id'],
      timestamp: row['timestamp'],
      hookType: row['hook_type'],
      category: row['category'],
      tool: row['tool'] ?? undefined,
      filePath: row['file_path'] ?? undefined,
      input: row['input'] ?? undefined,
      output: row['output'] ?? undefined,
      error: row['error'] ?? undefined,
      duration: row['duration'] ?? undefined,
      metadata: row['metadata'] ? JSON.parse(row['metadata'] as string) : undefined,
    }));

    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
