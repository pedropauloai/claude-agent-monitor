import { randomUUID } from 'node:crypto';
import type { Session } from '@cam/shared';
import { sessionQueries, agentQueries, eventQueries } from '../db/queries.js';

interface SessionRow {
  id: string;
  started_at: string;
  ended_at: string | null;
  working_directory: string;
  status: string;
  agent_count: number;
  event_count: number;
  metadata: string | null;
}

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    workingDirectory: row.working_directory,
    status: row.status as Session['status'],
    agentCount: row.agent_count,
    eventCount: row.event_count,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  };
}

export function createSession(workingDirectory: string, id?: string): Session {
  const sessionId = id || randomUUID();
  const now = new Date().toISOString();

  sessionQueries.insert().run(
    sessionId,
    now,
    workingDirectory,
    'active',
    0,
    0,
    null
  );

  return {
    id: sessionId,
    startedAt: now,
    workingDirectory,
    status: 'active',
    agentCount: 0,
    eventCount: 0,
  };
}

export function getSession(id: string): Session | null {
  const row = sessionQueries.getById().get(id) as SessionRow | undefined;
  return row ? rowToSession(row) : null;
}

export function listSessions(options: { status?: string; limit?: number; offset?: number } = {}): Session[] {
  const limit = options.limit ?? 10;
  const offset = options.offset ?? 0;

  let rows: SessionRow[];
  if (options.status) {
    rows = sessionQueries.getByStatus().all(options.status, limit, offset) as SessionRow[];
  } else {
    rows = sessionQueries.getAll().all(limit, offset) as SessionRow[];
  }

  return rows.map(rowToSession);
}

export function listSessionsByProject(projectId: string, options: { limit?: number; offset?: number } = {}): Session[] {
  const limit = options.limit ?? 10;
  const offset = options.offset ?? 0;
  const rows = sessionQueries.getByProject().all(projectId, limit, offset) as SessionRow[];
  return rows.map(rowToSession);
}

export function deleteSession(id: string): boolean {
  const result = sessionQueries.deleteById().run(id);
  return result.changes > 0;
}

export function getSessionWithDetails(id: string) {
  const session = getSession(id);
  if (!session) return null;

  const agents = agentQueries.getBySession().all(id) as Array<Record<string, unknown>>;
  const mappedAgents = agents.map(a => ({
    id: a['id'],
    sessionId: a['session_id'],
    name: a['name'],
    type: a['type'],
    status: a['status'],
    firstSeenAt: a['first_seen_at'],
    lastActivityAt: a['last_activity_at'],
    currentTask: a['current_task'] ?? undefined,
    toolCallCount: a['tool_call_count'],
    errorCount: a['error_count'],
  }));

  return {
    ...session,
    agents: mappedAgents,
  };
}
