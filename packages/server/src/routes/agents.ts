import { Router } from 'express';
import type { Request, Response } from 'express';
import { agentQueries, eventQueries } from '../db/queries.js';
import { DEFAULT_EVENT_LIMIT } from '@cam/shared';

export const agentsRouter = Router();

interface AgentRow {
  id: string;
  session_id: string;
  name: string;
  type: string;
  status: string;
  first_seen_at: string;
  last_activity_at: string;
  current_task: string | null;
  tool_call_count: number;
  error_count: number;
}

function mapAgent(row: AgentRow) {
  return {
    id: row.id,
    sessionId: row.session_id,
    name: row.name,
    type: row.type,
    status: row.status,
    firstSeenAt: row.first_seen_at,
    lastActivityAt: row.last_activity_at,
    currentTask: row.current_task ?? undefined,
    toolCallCount: row.tool_call_count,
    errorCount: row.error_count,
  };
}

// GET /api/sessions/:id/agents
agentsRouter.get('/:id/agents', (req: Request, res: Response) => {
  try {
    const sessionId = req.params['id']!;
    // Return all agents for the session - frontend handles display limits
    const rows = agentQueries.getBySession().all(sessionId) as AgentRow[];
    const agents = rows.map(mapAgent);
    res.json({ agents });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/sessions/:id/agents/:agentId/events
agentsRouter.get('/:id/agents/:agentId/events', (req: Request, res: Response) => {
  try {
    const sessionId = req.params['id']!;
    const agentId = req.params['agentId']!;
    const category = req.query['category'] as string | undefined;
    const limit = parseInt(req.query['limit'] as string) || DEFAULT_EVENT_LIMIT;
    const offset = parseInt(req.query['offset'] as string) || 0;

    let rows;
    if (category) {
      rows = eventQueries.getByAgentAndCategory().all(sessionId, agentId, category, limit, offset);
    } else {
      rows = eventQueries.getBySessionAndAgent().all(sessionId, agentId, limit, offset);
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
