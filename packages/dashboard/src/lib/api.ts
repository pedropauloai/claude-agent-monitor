const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// === Sessions ===

export async function getSessions(params?: { status?: string; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return request<{ sessions: any[] }>(`/sessions${qs ? `?${qs}` : ''}`);
}

export async function getSession(id: string) {
  return request<{ session: any }>(`/sessions/${id}`);
}

export async function deleteSession(id: string) {
  return request(`/sessions/${id}`, { method: 'DELETE' });
}

// === Agents ===

export async function getAgents(sessionId: string) {
  return request<{ agents: any[] }>(`/sessions/${sessionId}/agents`);
}

export async function getAgentEvents(sessionId: string, agentId: string, params?: { category?: string; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return request<{ events: any[] }>(`/sessions/${sessionId}/agents/${agentId}/events${qs ? `?${qs}` : ''}`);
}

// === Events ===

export async function getEvents(sessionId: string, params?: { category?: string; agent_id?: string; tool?: string; limit?: number; offset?: number }) {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.agent_id) query.set('agent_id', params.agent_id);
  if (params?.tool) query.set('tool', params.tool);
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));
  const qs = query.toString();
  return request<{ events: any[] }>(`/sessions/${sessionId}/events${qs ? `?${qs}` : ''}`);
}

// === Files ===

export async function getFiles(sessionId: string) {
  return request<{ files: any[] }>(`/sessions/${sessionId}/files`);
}

// === Stats ===

export async function getStats(sessionId: string) {
  return request<any>(`/sessions/${sessionId}/stats`);
}

// === Projects (Pilar 2) ===

export async function getProjects() {
  return request<{ projects: any[] }>('/projects');
}

export async function getProject(id: string) {
  return request<{ project: any }>(`/projects/${id}`);
}

export async function createProject(data: { name: string; prd_content: string; parse_method?: string }) {
  return request<{ project: any }>('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: string) {
  return request(`/projects/${id}`, { method: 'DELETE' });
}

// === Sprints (Pilar 2) ===

export async function getSprints(projectId: string) {
  return request<{ sprints: any[] }>(`/projects/${projectId}/sprints`);
}

export async function createSprint(projectId: string, data: { name: string; task_ids?: string[] }) {
  return request<{ sprint: any }>(`/projects/${projectId}/sprints`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// === PRD Tasks (Pilar 2) ===

export async function getTasks(projectId: string, params?: { sprint_id?: string; status?: string; agent?: string; priority?: string }) {
  const query = new URLSearchParams();
  if (params?.sprint_id) query.set('sprint_id', params.sprint_id);
  if (params?.status) query.set('status', params.status);
  if (params?.agent) query.set('agent', params.agent);
  if (params?.priority) query.set('priority', params.priority);
  const qs = query.toString();
  return request<{ tasks: any[]; summary: any }>(`/projects/${projectId}/tasks${qs ? `?${qs}` : ''}`);
}

export async function updateTask(projectId: string, taskId: string, data: any) {
  return request(`/projects/${projectId}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getTaskActivity(projectId: string, taskId: string) {
  return request<{ activities: any[] }>(`/projects/${projectId}/tasks/${taskId}/activity`);
}

// === PRD Parse ===

export async function parsePrd(data: { content: string; method?: string }) {
  return request<any>('/parse-prd', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// === Project Registry (Sprint 8) ===

export interface ProjectRegistration {
  working_directory: string;
  project_id: string;
  registered_at: string;
  prd_path?: string;
  hooks_installed: number;
  project_name?: string;
  project_status?: string;
}

export async function getRegisteredProjects() {
  return request<{ registrations: ProjectRegistration[] }>('/registry');
}

export async function getProjectSessions(projectId: string) {
  const query = new URLSearchParams();
  query.set('project_id', projectId);
  return request<{ sessions: any[] }>(`/sessions?${query.toString()}`);
}

export async function getProjectAgents(projectId: string) {
  try {
    const { sessions } = await getProjectSessions(projectId);
    const agentPromises = sessions.map(async (session: any) => {
      try {
        const { agents } = await getAgents(session.id);
        return agents;
      } catch {
        return [];
      }
    });
    const results = await Promise.all(agentPromises);
    return { agents: results.flat() };
  } catch {
    return { agents: [] };
  }
}

