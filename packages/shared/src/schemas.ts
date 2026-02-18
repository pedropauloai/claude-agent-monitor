import { z } from 'zod';

// === Hook Event Schemas ===

export const hookTypeSchema = z.enum([
  'PreToolUse',
  'PostToolUse',
  'PostToolUseFailure',
  'Notification',
  'Stop',
  'SubagentStop',
  'SubagentStart',
  'PreCompact',
  'PostCompact',
  'PreToolUseRejected',
  'ToolError',
  'SessionStart',
  'SessionEnd',
  'UserPromptSubmit',
]);

export const eventCategorySchema = z.enum([
  'tool_call',
  'file_change',
  'command',
  'message',
  'lifecycle',
  'error',
  'compact',
  'notification',
]);

export const incomingEventSchema = z.object({
  hook: hookTypeSchema,
  timestamp: z.string().optional(),
  session_id: z.string().optional(),
  agent_id: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  tool: z.string().optional(),
  input: z.unknown().optional(),
});

// === Session Schemas ===

export const sessionStatusSchema = z.enum(['active', 'completed', 'error']);

export const sessionSchema = z.object({
  id: z.string(),
  startedAt: z.string(),
  endedAt: z.string().optional(),
  workingDirectory: z.string(),
  status: sessionStatusSchema,
  agentCount: z.number().int().min(0),
  eventCount: z.number().int().min(0),
  metadata: z.record(z.unknown()).optional(),
});

// === Agent Schemas ===

export const agentStatusSchema = z.enum([
  'active',
  'idle',
  'error',
  'completed',
  'shutdown',
]);

export const agentSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  name: z.string(),
  type: z.string(),
  status: agentStatusSchema,
  firstSeenAt: z.string(),
  lastActivityAt: z.string(),
  currentTask: z.string().optional(),
  toolCallCount: z.number().int().min(0),
  errorCount: z.number().int().min(0),
});

// === Event Schemas ===

export const agentEventSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  agentId: z.string(),
  timestamp: z.string(),
  hookType: hookTypeSchema,
  category: eventCategorySchema,
  tool: z.string().optional(),
  filePath: z.string().optional(),
  input: z.string().optional(),
  output: z.string().optional(),
  error: z.string().optional(),
  duration: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// === File Change Schemas ===

export const fileChangeTypeSchema = z.enum(['created', 'modified', 'read']);

export const fileChangeSchema = z.object({
  filePath: z.string(),
  sessionId: z.string(),
  agentId: z.string(),
  changeType: fileChangeTypeSchema,
  firstTouchedAt: z.string(),
  lastTouchedAt: z.string(),
  touchCount: z.number().int().min(1),
});

// === Project Schemas (Pilar 2) ===

export const projectStatusSchema = z.enum(['active', 'completed', 'archived']);

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  prdSource: z.string(),
  prdContent: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: projectStatusSchema,
  totalTasks: z.number().int().min(0),
  completedTasks: z.number().int().min(0),
  currentSprintId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const sprintStatusSchema = z.enum(['planned', 'active', 'completed']);

export const sprintSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  order: z.number().int().min(1),
  status: sprintStatusSchema,
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  totalTasks: z.number().int().min(0),
  completedTasks: z.number().int().min(0),
  metadata: z.record(z.unknown()).optional(),
});

export const prdTaskStatusSchema = z.enum([
  'backlog',
  'planned',
  'pending',
  'in_progress',
  'in_review',
  'completed',
  'blocked',
  'deferred',
]);

export const taskPrioritySchema = z.enum(['critical', 'high', 'medium', 'low']);

export const prdTaskSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  sprintId: z.string().optional(),
  externalId: z.string().optional(),
  title: z.string(),
  description: z.string(),
  acceptanceCriteria: z.array(z.string()).optional(),
  status: prdTaskStatusSchema,
  priority: taskPrioritySchema,
  complexity: z.number().int().min(1).max(10).optional(),
  tags: z.array(z.string()).optional(),
  dependsOn: z.array(z.string()),
  blockedBy: z.array(z.string()),
  assignedAgent: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  sessionId: z.string().optional(),
  prdSection: z.string().optional(),
  prdSubsection: z.string().optional(),
  prdLineStart: z.number().int().optional(),
  prdLineEnd: z.number().int().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const parseMethodSchema = z.enum(['structured', 'ai_assisted', 'manual']);

// === Task Item Schemas ===

export const taskItemSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  subject: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed']),
  owner: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// === Task Activity Schemas ===

export const taskActivityTypeSchema = z.enum([
  'task_created',
  'task_started',
  'task_completed',
  'task_blocked',
  'task_unblocked',
  'agent_assigned',
  'file_modified',
  'error_occurred',
  'manual_update',
]);

export const taskActivitySchema = z.object({
  id: z.string(),
  prdTaskId: z.string(),
  eventId: z.string(),
  sessionId: z.string(),
  agentId: z.string(),
  activityType: taskActivityTypeSchema,
  timestamp: z.string(),
  details: z.string().optional(),
});

// === API Request Schemas ===

export const createProjectRequestSchema = z.object({
  name: z.string().min(1),
  prd_content: z.string(),
  parse_method: parseMethodSchema.default('structured'),
});

export const createSprintRequestSchema = z.object({
  name: z.string().min(1),
  task_ids: z.array(z.string()).optional(),
});

export const parsePrdRequestSchema = z.object({
  content: z.string().min(1),
  method: parseMethodSchema.default('structured'),
});

export const updateTaskRequestSchema = z.object({
  status: prdTaskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assignedAgent: z.string().optional(),
  sprintId: z.string().optional(),
});

export const createTaskRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  status: prdTaskStatusSchema.default('planned'),
  priority: taskPrioritySchema.default('medium'),
  complexity: z.number().int().min(1).max(10).optional(),
  tags: z.array(z.string()).optional(),
  sprint_id: z.string().optional(),
  prd_section: z.string().optional(),
  prd_subsection: z.string().optional(),
  depends_on: z.array(z.string()).optional(),
  external_id: z.string().optional(),
});
