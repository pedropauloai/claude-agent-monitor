export interface Project {
  id: string;
  name: string;
  description?: string;
  prdSource: string;
  prdContent: string;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
  totalTasks: number;
  completedTasks: number;
  currentSprintId?: string;
  metadata?: Record<string, unknown>;
}

export type ProjectStatus = 'active' | 'completed' | 'archived';

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  order: number;
  status: SprintStatus;
  startedAt?: string;
  completedAt?: string;
  totalTasks: number;
  completedTasks: number;
  metadata?: Record<string, unknown>;
}

export type SprintStatus = 'planned' | 'active' | 'completed';

export interface PRDTask {
  id: string;
  projectId: string;
  sprintId?: string;
  externalId?: string;
  title: string;
  description: string;
  acceptanceCriteria?: string[];
  status: PRDTaskStatus;
  priority: TaskPriority;
  complexity?: number;
  tags?: string[];
  dependsOn: string[];
  blockedBy: string[];
  assignedAgent?: string;
  startedAt?: string;
  completedAt?: string;
  sessionId?: string;
  prdSection?: string;
  prdLineStart?: number;
  prdLineEnd?: number;
  createdAt: string;
  updatedAt: string;
}

export type PRDTaskStatus =
  | 'backlog'
  | 'planned'
  | 'pending'
  | 'in_progress'
  | 'in_review'
  | 'completed'
  | 'blocked'
  | 'deferred';

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface PRDDocument {
  id: string;
  projectId: string;
  version: number;
  rawContent: string;
  sections: PRDSection[];
  parsedAt: string;
  parseMethod: ParseMethod;
}

export type ParseMethod = 'structured' | 'ai_assisted' | 'manual';

export interface PRDSection {
  id: string;
  title: string;
  content: string;
  order: number;
  level: number;
  taskIds: string[];
  completionPercent: number;
}

export interface ProjectRegistry {
  workingDirectory: string;
  projectId: string;
  registeredAt: string;
  prdPath?: string;
  hooksInstalled: boolean;
}
