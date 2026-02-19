# Claude Agent Monitor - PRD (Product Requirements Document)

> Open-source Mission Control for Claude Code agents: real-time observability + visual PRD/Sprint tracking

**Version**: 3.1.0
**Date**: 2026-02-17
**Status**: Active (Sprint 11 completed, Sprint 12 planned)
**License**: MIT

---

# PART 1 - PRD (WHAT to build)

---

## 1. Product Vision

### Name
**Claude Agent Monitor** (CAM)

### Value Proposition
A Mission Control that transforms the "black box" experience of Claude Code agents into a fully transparent and observable experience. Two complementary pillars:

| Pillar | Question it answers | Data source |
|--------|---------------------|-------------|
| **Agent Monitor** | "What is each agent doing RIGHT NOW?" | Real-time hooks |
| **PRD Tracker** | "Where are we in the project? What's left?" | TaskCreate/TaskUpdate captured via hooks |

Deliver a PRD. Open the dashboard. Let the agents work. Watch it all happen.

### Target Users
- Developers who use **Claude Code Teams** (tmux + agents) to execute sprints on real projects
- Any Claude Code user who wants observability into what agents are doing
- Ideal setup: **tmux + Teams** (each agent = separate process = full E2E tracking)

### Differentiators
- **Only visual Mission Control** for Claude Code agents (none exists today)
- **Interactive Agent Map**: real-time pixel art visualization where agents are characters that move between zones, interact and execute actions - inspired by OPES Big Brother
- **PRD-driven**: import a PRD, the dashboard automatically tracks progress as agents complete tasks
- **Zero config**: one command to install, auto-configured hooks
- **Auto-updating**: tasks move on their own in the Kanban as agents work
- **Open-source**: community can create custom themes (Open Core model)
- **Universal**: works on any project - just `cam init` + deliver the PRD
- **Premium themes** (future): Terminal and Pixel Art as complete alternative experiences

---

## 2. Problem

### Current Situation
When a developer uses Claude Code with background agents (`Task` tool with `run_in_background: true`, or `TeamCreate` with multiple teammates), the only way to monitor is:

1. Manually reading output files (`Read` on the output_file)
2. Running `tail` on logs
3. Waiting for the idle/completion notification
4. Opening the task list and reading textual status

### Pain Points

**Pillar 1 - Agent Observability**:
| Pain Point | Severity | Frequency |
|------------|----------|-----------|
| Don't know if the agent is stuck or working | High | Every session |
| Lose context of what each agent did | High | Teams > 2 agents |
| Don't know which files were modified | Medium | Large projects |
| Need to manually poll outputs | Medium | Background tasks |
| Can't see errors until the agent finishes | High | Debug sessions |
| Lack of overall team progress view | Medium | Team workflows |

**Pillar 2 - PRD/Sprint Tracking**:
| Pain Point | Severity | Frequency |
|------------|----------|-----------|
| Don't know which stage of the PRD we're at | High | Every project |
| No visibility into which tasks are already completed | High | Long sprints |
| Need to open textual task list and count manually | Medium | Every session |
| Don't know what % of the sprint/project is complete | High | Multi-sprint projects |
| Can't see blocked dependencies visually | Medium | Complex tasks |
| Lack of burndown/progress to know if we're on track | Medium | Projects with deadlines |

### Opportunity
Claude Code exposes **hooks** - shell commands that execute in response to agent events. These hooks are the perfect integration point: they capture events in real-time without modifying Claude Code's behavior.

Furthermore, when agents use `TaskCreate`, `TaskUpdate`, and `TaskList`, these calls pass through hooks like any other tool. This means we can **automatically capture task progress** without any manual input - the Kanban updates itself.

---

# PART 2 - SPEC (HOW to build)

---

## 3. Technical Architecture

### Overview

```
                          +---> [Pillar 1] Agent Monitor (real-time activity)
                          |
PRD.md --> cam init --+   |
                      |   |
Claude Code (hooks) --+--> Local Server (Node.js) ---> Dashboard (Browser)
       |                      |                              |
  hook scripts           REST + SSE                    React SPA
  (shell cmds)          (port 7890)                (3 visual themes)
                          |
                          +---> [Pillar 2] PRD Tracker (sprint/task progress)
```

### Data Flow - Pillar 1 (Agent Monitor)

```
1. Claude Code executes an action (e.g., Edit file)
2. Configured hook triggers a shell command
3. Shell command POSTs to the local server (localhost:7890)
4. Server processes, stores in memory, and emits SSE event
5. Dashboard receives SSE and updates UI in real-time
6. Data persisted in SQLite for session history
```

### Data Flow - Pillar 2 (PRD Tracker)

```
1. User provides PRD.md via `cam init --prd ./PRD.md`
2. PRD is parsed into structured tasks (AI-assisted or structured format)
3. User reviews/confirms tasks in the dashboard
4. Agents work -> hooks capture TaskCreate/TaskUpdate calls
5. Correlation Engine maps tool calls to PRD tasks
6. Dashboard updates Kanban/Progress/Burndown automatically
7. At the end, complete PRD execution report
```

### Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Hook Scripts** | Bash/PowerShell + curl | Universal, zero deps |
| **Server** | Node.js + Express | Lightweight, easy to install |
| **Database** | SQLite (better-sqlite3) | Zero config, local file |
| **SSE** | Native EventSource API | Simple, unidirectional, perfect for monitoring |
| **Dashboard** | React 19 + Vite | Fast, modern, HMR for dev |
| **Styling** | Tailwind CSS 4 | Consistent, easy theming |
| **State** | Zustand | Lightweight, no boilerplate |
| **Charts** | Recharts | Simple, React-native |

### Why NOT WebSocket?
SSE (Server-Sent Events) is sufficient because:
- Data flow is **unidirectional** (server -> client)
- The dashboard only observes, it doesn't send commands
- SSE reconnects automatically
- Less complexity than WebSocket
- Works natively without extra libraries

---

## 4. Data Model

### 4.1 Session

A session represents a Claude Code invocation.

```typescript
interface Session {
  id: string;              // UUID generated at start
  startedAt: string;       // ISO timestamp
  endedAt?: string;        // null if active
  workingDirectory: string;
  status: 'active' | 'completed' | 'error';
  agentCount: number;      // total observed agents
  eventCount: number;      // total received events
  metadata?: Record<string, unknown>;
}
```

### 4.2 Agent

An agent is a Claude Code process (main or teammate).

```typescript
interface Agent {
  id: string;              // agent ID from Claude Code (or "main" for the primary)
  sessionId: string;       // FK to Session
  name: string;            // human-readable name (e.g., "researcher", "frontend-engineer")
  type: string;            // subagent_type (e.g., "general-purpose", "Explore")
  status: AgentStatus;
  firstSeenAt: string;     // when first seen
  lastActivityAt: string;  // last received event
  currentTask?: string;    // task ID being executed
  toolCallCount: number;
  errorCount: number;
}

type AgentStatus =
  | 'active'       // actively receiving events
  | 'idle'         // no activity for > 30s
  | 'error'        // last event was an error
  | 'completed'    // agent finished
  | 'shutdown';    // received shutdown request
```

### 4.3 Event

Individual event captured by a hook.

```typescript
interface AgentEvent {
  id: string;              // UUID
  sessionId: string;       // FK
  agentId: string;         // FK (which agent generated it)
  timestamp: string;       // ISO timestamp
  hookType: HookType;      // which hook fired
  category: EventCategory; // classification for UI

  // Hook-specific payload
  tool?: string;           // tool name (Edit, Bash, Read, etc.)
  filePath?: string;       // affected file
  input?: string;          // truncated input (first 500 chars)
  output?: string;         // truncated output (first 500 chars)
  error?: string;          // error message if any
  duration?: number;       // execution time in ms

  // Metadata
  metadata?: Record<string, unknown>;
}

type HookType =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'Notification'
  | 'Stop'
  | 'SubagentStop'
  | 'PreCompact'
  | 'PostCompact'
  | 'PreToolUseRejected'
  | 'ToolError'
  | 'SessionStart';

type EventCategory =
  | 'tool_call'    // PreToolUse/PostToolUse
  | 'file_change'  // Edit/Write tool events
  | 'command'       // Bash tool events
  | 'message'       // SendMessage events
  | 'lifecycle'     // Start/Stop/Shutdown
  | 'error'         // Errors e rejections
  | 'compact'       // Context compaction
  | 'notification'; // Notifications
```

### 4.4 TaskItem

Mirror of team tasks (captured indirectly via tool calls).

```typescript
interface TaskItem {
  id: string;
  sessionId: string;
  subject: string;
  status: 'pending' | 'in_progress' | 'completed';
  owner?: string;          // agent name
  createdAt: string;
  updatedAt: string;
}
```

### 4.5 FileChange

File modified during the session.

```typescript
interface FileChange {
  filePath: string;
  sessionId: string;
  agentId: string;
  changeType: 'created' | 'modified' | 'read';
  firstTouchedAt: string;
  lastTouchedAt: string;
  touchCount: number;      // how many times it was touched
}
```

### 4.6 Project (Pillar 2)

Main container that groups PRD + sessions + tasks.

```typescript
interface Project {
  id: string;              // UUID
  name: string;            // project name (e.g., "claude-agent-monitor")
  description?: string;    // short description
  prdSource: string;       // original path of PRD.md
  prdContent: string;      // raw PRD content
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'completed' | 'archived';
  totalTasks: number;
  completedTasks: number;
  currentSprintId?: string;
  metadata?: Record<string, unknown>;
}
```

### 4.7 Sprint (Pillar 2)

Phase/sprint within a project. A project can have multiple sprints.

```typescript
interface Sprint {
  id: string;              // UUID
  projectId: string;       // FK to Project
  name: string;            // e.g., "MVP", "Sprint 1", "Auth Module"
  description?: string;
  order: number;           // order in the project (1, 2, 3...)
  status: 'planned' | 'active' | 'completed';
  startedAt?: string;
  completedAt?: string;
  totalTasks: number;
  completedTasks: number;
  metadata?: Record<string, unknown>;
}
```

### 4.8 PRDTask (Pillar 2)

Task extracted from the PRD with status, assignee, and dependencies. Unlike `TaskItem` (4.4) which is an ephemeral mirror of Claude Code tasks, `PRDTask` is persistent and represents the project's view.

```typescript
interface PRDTask {
  id: string;              // UUID
  projectId: string;       // FK to Project
  sprintId?: string;       // FK to Sprint (null = backlog)
  externalId?: string;     // task ID in Claude Code (for correlation)

  // Content
  title: string;           // task title
  description: string;     // detailed description
  acceptanceCriteria?: string[]; // acceptance criteria

  // Organization
  status: PRDTaskStatus;
  priority: 'critical' | 'high' | 'medium' | 'low';
  complexity?: number;     // 1-10 (estimated by AI or manual)
  tags?: string[];         // free-form labels

  // Dependencies
  dependsOn: string[];     // IDs of tasks this one depends on
  blockedBy: string[];     // IDs of tasks blocking this one (computed)

  // Execution
  assignedAgent?: string;  // name of the agent executing this
  startedAt?: string;
  completedAt?: string;
  sessionId?: string;      // which session executed this

  // PRD source mapping
  prdSection?: string;     // which PRD section this came from
  prdLineStart?: number;   // start line in the PRD
  prdLineEnd?: number;     // end line in the PRD

  createdAt: string;
  updatedAt: string;
}

type PRDTaskStatus =
  | 'backlog'        // in backlog, not planned for a sprint
  | 'planned'        // planned for a sprint
  | 'pending'        // in the active sprint, waiting
  | 'in_progress'    // being executed by an agent
  | 'in_review'      // completed but awaiting validation
  | 'completed'      // completed and validated
  | 'blocked'        // blocked by a dependency
  | 'deferred';      // deferred to a future sprint
```

### 4.9 TaskActivity (Pillar 2)

Bridge between agent events (Pillar 1) and PRD tasks (Pillar 2). It's the "glue" that lets the dashboard know that "agent X editing file Y" corresponds to "Task 5 of Sprint 2".

```typescript
interface TaskActivity {
  id: string;              // UUID
  prdTaskId: string;       // FK to PRDTask
  eventId: string;         // FK to AgentEvent
  sessionId: string;       // FK to Session
  agentId: string;         // which agent
  activityType: TaskActivityType;
  timestamp: string;
  details?: string;        // human-readable description
}

type TaskActivityType =
  | 'task_created'     // TaskCreate detected in hook
  | 'task_started'     // TaskUpdate status -> in_progress
  | 'task_completed'   // TaskUpdate status -> completed
  | 'task_blocked'     // unresolved dependency
  | 'task_unblocked'   // dependency resolved
  | 'agent_assigned'   // agent assigned to task
  | 'file_modified'    // relevant file edited
  | 'error_occurred'   // error during task execution
  | 'manual_update';   // user updated manually
```

### 4.10 PRDDocument (Pillar 2)

Parsed representation of the PRD for reference and tracking.

```typescript
interface PRDDocument {
  id: string;
  projectId: string;       // FK to Project
  version: number;         // versioning (PRD can be updated)
  rawContent: string;      // original markdown
  sections: PRDSection[];  // parsed sections
  parsedAt: string;
  parseMethod: 'structured' | 'ai_assisted' | 'manual';
}

interface PRDSection {
  id: string;
  title: string;
  content: string;
  order: number;
  level: number;           // heading level (1, 2, 3)
  taskIds: string[];       // PRDTasks extracted from this section
  completionPercent: number; // computed based on tasks
}
```

### 4.11 Correlation Engine

The Correlation Engine is the service that connects the two pillars. It observes Pillar 1 events and automatically updates Pillar 2 state.

**Correlation rules**:

```typescript
// Events that trigger automatic updates in the PRD Tracker:
const CORRELATION_RULES = {
  // 1. TaskCreate detected → creates/updates corresponding PRDTask
  'TaskCreate': (event) => {
    // Searches for PRDTask with similar title (fuzzy match)
    // If found → links via externalId
    // If not found → creates as "unplanned task"
  },

  // 2. TaskUpdate with status change → updates PRDTask
  'TaskUpdate': (event) => {
    // event.data.status === 'in_progress' → PRDTask.status = 'in_progress'
    // event.data.status === 'completed' → PRDTask.status = 'completed'
    // event.data.owner → PRDTask.assignedAgent
  },

  // 3. TaskList called → synchronizes overall state
  'TaskList': (event) => {
    // Compares Claude Code tasks with PRDTasks
    // Updates divergences
  },

  // 4. File Edit/Write on a mapped file → records activity
  'Edit|Write': (event) => {
    // If filePath is associated with a PRDTask → records TaskActivity
  },

  // 5. SendMessage between agents → collaboration tracking
  'SendMessage': (event) => {
    // Records inter-agent communication in the task context
  }
};
```

**Operation modes**:
1. **Auto** (default): Correlation Engine runs automatically, using fuzzy matching to link events to tasks
2. **Strict**: Only links when there's an exact ID match (fewer false positives)
3. **Manual**: Correlation disabled, user links manually in the dashboard

---

## 5. Hook Events

Claude Code supports hooks that execute shell commands in response to events. Reference: https://docs.anthropic.com/en/docs/claude-code/hooks

### 5.1 Hooks We Capture

#### 1. PreToolUse
**When**: Before each tool call
**Available data**: tool_name, tool_input
**Usage**: Record agent intent, tool tracking

```json
{
  "hook": "PreToolUse",
  "timestamp": "2026-02-14T10:30:00.000Z",
  "session_id": "abc-123",
  "agent_id": "main",
  "data": {
    "tool_name": "Edit",
    "tool_input": {
      "file_path": "/src/index.ts",
      "old_string": "const x = 1",
      "new_string": "const x = 2"
    }
  }
}
```

**Hook schema (.claude/settings.json)**:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "*",
        "command": "curl -s -X POST http://localhost:7890/api/events -H 'Content-Type: application/json' -d '{\"hook\":\"PreToolUse\",\"tool\":\"$CLAUDE_TOOL_NAME\",\"input\":$CLAUDE_TOOL_INPUT}'"
      }
    ]
  }
}
```

#### 2. PostToolUse
**When**: After each tool call completes
**Available data**: tool_name, tool_input, tool_output, duration
**Usage**: Record result, calculate duration, detect errors

```json
{
  "hook": "PostToolUse",
  "timestamp": "2026-02-14T10:30:01.500Z",
  "session_id": "abc-123",
  "agent_id": "main",
  "data": {
    "tool_name": "Edit",
    "tool_input": { "file_path": "/src/index.ts" },
    "tool_output": "File edited successfully",
    "duration_ms": 1500
  }
}
```

#### 3. Notification
**When**: Claude Code sends a notification to the user
**Available data**: message, level (info/warning/error)
**Usage**: Dashboard alerts, issue tracking

```json
{
  "hook": "Notification",
  "timestamp": "2026-02-14T10:35:00.000Z",
  "session_id": "abc-123",
  "agent_id": "researcher",
  "data": {
    "message": "Task completed: Implement auth module",
    "level": "info"
  }
}
```

#### 4. Stop
**When**: The main agent stops (end of conversation or error)
**Available data**: reason, stop_type
**Usage**: Mark session end, cleanup

```json
{
  "hook": "Stop",
  "timestamp": "2026-02-14T11:00:00.000Z",
  "session_id": "abc-123",
  "agent_id": "main",
  "data": {
    "reason": "end_turn",
    "stop_type": "natural"
  }
}
```

#### 5. SubagentStop
**When**: A sub-agent (teammate) stops
**Available data**: agent_id, agent_name, reason
**Usage**: Agent lifecycle tracking

```json
{
  "hook": "SubagentStop",
  "timestamp": "2026-02-14T10:45:00.000Z",
  "session_id": "abc-123",
  "agent_id": "researcher",
  "data": {
    "agent_name": "researcher",
    "reason": "shutdown_approved"
  }
}
```

#### 6. PreCompact
**When**: Before context is compacted (conversation truncation)
**Available data**: current_tokens, threshold
**Usage**: Context usage tracking

```json
{
  "hook": "PreCompact",
  "timestamp": "2026-02-14T10:50:00.000Z",
  "session_id": "abc-123",
  "agent_id": "main",
  "data": {
    "current_tokens": 180000,
    "threshold": 200000
  }
}
```

#### 7. PostCompact
**When**: After context is compacted
**Available data**: tokens_before, tokens_after
**Usage**: Compaction efficiency tracking

```json
{
  "hook": "PostCompact",
  "timestamp": "2026-02-14T10:50:05.000Z",
  "session_id": "abc-123",
  "agent_id": "main",
  "data": {
    "tokens_before": 180000,
    "tokens_after": 95000,
    "messages_removed": 42
  }
}
```

#### 8. PreToolUseRejected
**When**: User rejects a tool call
**Available data**: tool_name, tool_input, rejection_reason
**Usage**: Permission tracking and rejection patterns

```json
{
  "hook": "PreToolUseRejected",
  "timestamp": "2026-02-14T10:32:00.000Z",
  "session_id": "abc-123",
  "agent_id": "main",
  "data": {
    "tool_name": "Bash",
    "tool_input": { "command": "rm -rf /" },
    "rejection_reason": "user_denied"
  }
}
```

#### 9. ToolError
**When**: A tool fails during execution
**Available data**: tool_name, error_message, error_code
**Usage**: Error tracking, alerts

```json
{
  "hook": "ToolError",
  "timestamp": "2026-02-14T10:33:00.000Z",
  "session_id": "abc-123",
  "agent_id": "main",
  "data": {
    "tool_name": "Bash",
    "error_message": "Command failed with exit code 1",
    "error_code": 1
  }
}
```

#### 10. SessionStart (Custom - via init script)
**When**: Dashboard starts monitoring a session
**Available data**: working_directory, config
**Usage**: Initialize session in the dashboard

> Note: This is not a native Claude Code hook. It's emitted by the initialization script `cam start` that configures hooks and registers the session.

```json
{
  "hook": "SessionStart",
  "timestamp": "2026-02-14T10:00:00.000Z",
  "session_id": "abc-123",
  "agent_id": "system",
  "data": {
    "working_directory": "/Users/dev/my-project",
    "hooks_configured": 9,
    "server_port": 7890
  }
}
```

### 5.2 Complete Hook Configuration

File `.claude/settings.json` (auto-generated by `cam init`):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "*",
        "command": "cam-hook pre-tool-use"
      }
    ],
    "PostToolUse": [
      {
        "matcher": "*",
        "command": "cam-hook post-tool-use"
      }
    ],
    "Notification": [
      {
        "matcher": "*",
        "command": "cam-hook notification"
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "command": "cam-hook stop"
      }
    ],
    "SubagentStop": [
      {
        "matcher": "*",
        "command": "cam-hook subagent-stop"
      }
    ],
    "PreCompact": [
      {
        "matcher": "*",
        "command": "cam-hook pre-compact"
      }
    ],
    "PostCompact": [
      {
        "matcher": "*",
        "command": "cam-hook post-compact"
      }
    ]
  }
}
```

> `cam-hook` is a globally installed CLI binary/script that:
> 1. Reads environment variables injected by Claude Code (`$CLAUDE_TOOL_NAME`, `$CLAUDE_TOOL_INPUT`, etc.)
> 2. Serializes to JSON
> 3. POSTs to `http://localhost:7890/api/events`
> 4. Fails silently if the server is not running (doesn't block Claude Code)

---

## 6. Server API

### Base URL: `http://localhost:7890`

### 6.1 Event Ingestion

#### `POST /api/events`
Receives events from hooks. Main ingestion endpoint.

**Request**:
```json
{
  "hook": "PostToolUse",
  "timestamp": "2026-02-14T10:30:00.000Z",
  "session_id": "abc-123",
  "agent_id": "main",
  "data": { ... }
}
```

**Response**: `200 OK`
```json
{ "ok": true, "event_id": "evt_xyz" }
```

**Behavior**:
- Validates minimum schema (hook + timestamp required)
- Enriches with server timestamp if absent
- Persists in SQLite
- Emits via SSE to all connected clients
- Target latency: < 5ms (must not slow down Claude Code)

### 6.2 Session Management

#### `GET /api/sessions`
Lists all sessions.

**Query params**: `?status=active&limit=10`

**Response**:
```json
{
  "sessions": [
    {
      "id": "abc-123",
      "startedAt": "2026-02-14T10:00:00Z",
      "status": "active",
      "agentCount": 3,
      "eventCount": 142
    }
  ]
}
```

#### `GET /api/sessions/:id`
Details of a specific session.

**Response**: Complete Session with agents and stats.

#### `DELETE /api/sessions/:id`
Removes a session and all its events.

### 6.3 Agent Data

#### `GET /api/sessions/:id/agents`
Lists agents in a session.

**Response**:
```json
{
  "agents": [
    {
      "id": "main",
      "name": "main",
      "type": "orchestrator",
      "status": "active",
      "toolCallCount": 45,
      "errorCount": 2,
      "lastActivityAt": "2026-02-14T10:30:00Z"
    }
  ]
}
```

#### `GET /api/sessions/:id/agents/:agentId/events`
Events from a specific agent.

**Query params**: `?category=tool_call&limit=50&offset=0`

### 6.4 Events

#### `GET /api/sessions/:id/events`
Lists events from a session with filters.

**Query params**:
- `category`: filter by category (tool_call, file_change, error, etc.)
- `agent_id`: filter by agent
- `tool`: filter by tool name
- `since`: ISO timestamp (events after)
- `limit`: max results (default 100)
- `offset`: pagination

### 6.5 File Changes

#### `GET /api/sessions/:id/files`
Lists files modified in the session.

**Response**:
```json
{
  "files": [
    {
      "filePath": "src/index.ts",
      "agentId": "main",
      "changeType": "modified",
      "touchCount": 3,
      "lastTouchedAt": "2026-02-14T10:30:00Z"
    }
  ]
}
```

### 6.6 Real-time Stream (SSE)

#### `GET /api/stream`
Server-Sent Events stream for real-time updates.

**Query params**: `?session_id=abc-123` (optional, filters by session)

**Event types**:
```
event: agent_event
data: { "type": "tool_call", "agent": "main", "tool": "Edit", ... }

event: agent_status
data: { "agent": "researcher", "status": "idle", "previousStatus": "active" }

event: session_status
data: { "session": "abc-123", "status": "completed" }

event: heartbeat
data: { "timestamp": "2026-02-14T10:30:00Z", "connections": 2 }
```

**Heartbeat**: Every 15 seconds to keep the connection alive.

### 6.7 Projects (Pillar 2)

#### `POST /api/projects`
Creates a new project from a PRD.

**Request**:
```json
{
  "name": "my-awesome-app",
  "prd_content": "# PRD\n## Features\n- [ ] Auth module\n- [ ] Dashboard...",
  "parse_method": "ai_assisted"
}
```

**Response**: `201 Created`
```json
{
  "project": {
    "id": "proj_abc",
    "name": "my-awesome-app",
    "totalTasks": 12,
    "sprints": [
      { "id": "spr_1", "name": "MVP", "taskCount": 8 },
      { "id": "spr_2", "name": "Polish", "taskCount": 4 }
    ]
  },
  "tasks_preview": [
    { "id": "task_1", "title": "Auth module", "priority": "high", "complexity": 7 },
    { "id": "task_2", "title": "Dashboard layout", "priority": "high", "complexity": 5 }
  ]
}
```

#### `GET /api/projects`
Lists all projects.

#### `GET /api/projects/:id`
Project details with progress stats.

**Response**:
```json
{
  "project": {
    "id": "proj_abc",
    "name": "my-awesome-app",
    "status": "active",
    "totalTasks": 12,
    "completedTasks": 5,
    "completionPercent": 41.7,
    "currentSprint": {
      "id": "spr_1",
      "name": "MVP",
      "totalTasks": 8,
      "completedTasks": 5,
      "completionPercent": 62.5
    },
    "activeSessions": 1,
    "totalSessions": 3,
    "agentsUsed": ["main", "researcher", "frontend-engineer"]
  }
}
```

#### `DELETE /api/projects/:id`
Removes a project and all its data.

### 6.8 Sprints (Pillar 2)

#### `GET /api/projects/:id/sprints`
Lists sprints of a project.

#### `POST /api/projects/:id/sprints`
Creates a new sprint.

**Request**:
```json
{
  "name": "Sprint 2 - Auth",
  "task_ids": ["task_5", "task_6", "task_7"]
}
```

#### `PATCH /api/projects/:projectId/sprints/:sprintId`
Updates a sprint (status, add/remove tasks).

### 6.9 PRD Tasks (Pillar 2)

#### `GET /api/projects/:id/tasks`
Lists all project tasks.

**Query params**:
- `sprint_id`: filter by sprint
- `status`: filter by status (pending, in_progress, completed, blocked)
- `agent`: filter by assigned agent
- `priority`: filter by priority

**Response**:
```json
{
  "tasks": [
    {
      "id": "task_1",
      "title": "Implement auth module",
      "status": "in_progress",
      "priority": "high",
      "complexity": 7,
      "assignedAgent": "backend-engineer",
      "sprintId": "spr_1",
      "dependsOn": [],
      "blockedBy": [],
      "progress": {
        "filesModified": 4,
        "toolCalls": 23,
        "timeSpent": 1200
      }
    }
  ],
  "summary": {
    "total": 12,
    "backlog": 2,
    "pending": 3,
    "in_progress": 2,
    "completed": 5,
    "blocked": 0
  }
}
```

#### `PATCH /api/projects/:projectId/tasks/:taskId`
Manually updates a task (for user overrides).

#### `GET /api/projects/:id/tasks/:taskId/activity`
Activity history of a task (which agents touched it, which files, etc.)

### 6.10 PRD Parsing (Pillar 2)

#### `POST /api/parse-prd`
Parses a PRD and returns suggested tasks (without creating a project).

**Request**:
```json
{
  "content": "# PRD content here...",
  "method": "structured"
}
```

**Response**:
```json
{
  "sections": [
    { "title": "MVP Features", "level": 2, "taskCount": 5 }
  ],
  "suggested_tasks": [
    {
      "title": "Auth module",
      "description": "Implement user authentication...",
      "priority": "high",
      "complexity": 7,
      "dependsOn": [],
      "prdSection": "MVP Features",
      "prdLineStart": 15,
      "prdLineEnd": 22
    }
  ],
  "suggested_sprints": [
    { "name": "MVP", "taskIndices": [0, 1, 2, 3, 4] },
    { "name": "Polish", "taskIndices": [5, 6, 7] }
  ]
}
```

**Supported parsing methods**:

1. **`structured`** - For PRDs with clear checkboxes/lists:
   - Detects `- [ ]` and `- [x]` as tasks
   - Detects headings as sprints/sections
   - Detects explicit dependencies (e.g., "depends on Task X")
   - Fast, deterministic, no AI cost

2. **`ai_assisted`** - For free-text PRDs:
   - Uses local LLM or API to extract tasks
   - Estimates complexity (1-10)
   - Suggests semantic dependencies
   - Suggests sprint grouping
   - Slower, better results for ambiguous PRDs

3. **`manual`** - User creates tasks manually in the dashboard

### 6.11 PRD Progress SSE Events (Pillar 2)

New event types in the SSE stream (`GET /api/stream`):

```
event: task_status_changed
data: { "taskId": "task_5", "oldStatus": "pending", "newStatus": "in_progress", "agent": "backend-engineer" }

event: task_assigned
data: { "taskId": "task_5", "agent": "backend-engineer" }

event: sprint_progress
data: { "sprintId": "spr_1", "completedTasks": 6, "totalTasks": 8, "percent": 75.0 }

event: project_progress
data: { "projectId": "proj_abc", "completedTasks": 6, "totalTasks": 12, "percent": 50.0 }

event: task_blocked
data: { "taskId": "task_7", "blockedBy": ["task_5"], "reason": "dependency" }

event: task_unblocked
data: { "taskId": "task_7", "unblockedBy": "task_5" }

event: correlation_match
data: { "eventId": "evt_123", "taskId": "task_5", "confidence": 0.92, "reason": "TaskUpdate status match" }
```

### 6.12 Stats

#### `GET /api/sessions/:id/stats`
Aggregated session metrics.

**Response**:
```json
{
  "duration_seconds": 3600,
  "total_events": 342,
  "total_tool_calls": 280,
  "total_errors": 5,
  "tools_breakdown": {
    "Edit": 89,
    "Read": 72,
    "Bash": 45,
    "Grep": 38,
    "Write": 20,
    "Glob": 16
  },
  "agents_breakdown": {
    "main": { "events": 120, "errors": 1 },
    "researcher": { "events": 98, "errors": 2 },
    "frontend": { "events": 124, "errors": 2 }
  },
  "files_modified": 23,
  "files_created": 7,
  "files_read": 156,
  "compactions": 2,
  "timeline": [
    { "minute": "10:00", "events": 12 },
    { "minute": "10:01", "events": 8 }
  ]
}
```

---

## 7. Dashboard Components

### 7.1 AgentPanel

**Description**: Side panel with a list of all agents and their status.

**Features**:
- Lists all agents from the active session
- Status indicator (colored dot or sprite depending on theme)
- Click to select agent and view details
- Counters: tool calls, errors, active time
- Sort by: status, recent activity, name

**Theme variations**:
- Pixel: Sprites with animation, HP bar = progress
- Modern: Cards with identicon avatar, badges
- Terminal: List with status chars `[*] active  [-] idle  [!] error  [x] done`

### 7.2 ActivityFeed

**Description**: Chronological feed of real-time events.

**Features**:
- Infinite event stream (virtual scroll for performance)
- Icon/emoji per tool type
- Color by category (green=success, red=error, yellow=warning)
- Expand to see full input/output
- Filters: by agent, by tool, by category
- Follow mode (auto-scroll) with toggle
- Text search

**Theme variations**:
- Pixel: RPG-style dialogue balloons, entrance animation
- Modern: Vertical timeline with expandable cards
- Terminal: Log lines with timestamps, `grep`-like filtering

### 7.3 FileWatcher

**Description**: File tree with modification highlights.

**Features**:
- Project file tree (or flat list)
- Color coding: green=created, yellow=modified, blue=read
- Badge with touch count
- Click to view file change history
- Indicator of which agent touched the file

**Theme variations**:
- Pixel: Pixelated file icons, "glow" effect on new ones
- Modern: Tree view with VS Code icons, hover preview
- Terminal: `git status` style output with letters (M/A/R)

### 7.4 StatsBar

**Description**: Aggregated metrics bar at the top or bottom.

**Features**:
- Elapsed time (active timer)
- Total tool calls
- Total errors
- Modified files
- Active agents
- Events/minute (sparkline)

**Theme variations**:
- Pixel: Game HUD style bar with pixelated icons
- Modern: Minimalist metrics cards with trend arrows
- Terminal: vim/tmux style status line `[3 agents] [142 events] [5 errors] [23 files] [01:23:45]`

### 7.5 AgentDetail

**Description**: Detail panel for the selected agent.

**Features**:
- Agent information (name, type, status, active time)
- Tool calls timeline (filtered mini activity feed)
- Files the agent touched
- Recent errors
- Current task (if in a team)
- Messages sent/received (SendMessage events)

**Theme variations**:
- Pixel: RPG-style character sheet (stats, inventory, quest log)
- Modern: Tab panel with sections (Activity, Files, Errors, Messages)
- Terminal: Split panels with tabular data

### 7.6 SessionTimeline

**Description**: Temporal visualization of the session (mini Gantt chart).

**Features**:
- X axis = time
- One row per agent
- Segments colored by status (active/idle/error)
- Markers for important events (start, stop, error, compaction)
- Zoom in/out
- Hover to see moment details

**Theme variations**:
- Pixel: Pixelated bars styled like game progress bars
- Modern: Clean Gantt chart with gradients
- Terminal: ASCII bars `[=====>------|!!|=====>]`

### 7.7 KanbanBoard (Pillar 2)

**Description**: Visual Kanban board where tasks move automatically between columns as agents work.

**Columns**: Backlog | Planned | In Progress | In Review | Completed | Blocked

**Features**:
- Task cards with title, priority (color), complexity (badge), assigned agent
- Cards move automatically when hooks capture TaskUpdate
- Column transition animation (smooth slide)
- Manual drag & drop for user overrides
- Filters: by sprint, by agent, by priority
- Per-column counters
- Visual indicator of blocked tasks (red line connecting dependencies)
- Click on card opens details with activity history

**Theme variations**:
- Pixel: RPG tavern quest board, tasks are scrolls, "Completed" column has pixelated confetti
- Modern: Linear-style cards with status dots, smooth drag & drop, glassmorphism
- Terminal: Table with columns separated by `|`, status chars `[>] in_progress  [x] done  [!] blocked`

### 7.8 SprintProgress (Pillar 2)

**Description**: Visual progress indicator for the current sprint.

**Features**:
- Main progress bar (% complete)
- Count: "5 of 8 tasks completed"
- Mini-donut chart with status breakdown (pending/progress/done/blocked)
- Estimated time remaining (based on average velocity)
- Sprint selector (dropdown to view previous sprints)
- Velocity: tasks/hour (trend over last 30min)

**Theme variations**:
- Pixel: XP bar that fills up, level up on sprint completion, stars per completed task
- Modern: Circular progress ring with % in center, mini velocity chart
- Terminal: `Sprint MVP [=======>----] 62.5% (5/8)  ~2.1 tasks/hr`

### 7.9 PRDOverview (Pillar 2)

**Description**: Panoramic view of the entire PRD with sections colored by completion status.

**Features**:
- Renders the original PRD as a document
- Colored sections: green (100% tasks done), yellow (in progress), gray (not started), red (blocked)
- Hover on section shows tasks from that section
- Click navigates to tasks in the KanbanBoard
- Sidebar with % for each section
- "Diff" mode: shows what changed since the beginning

**Theme variations**:
- Pixel: RPG world map, sections are regions, completed regions become illuminated
- Modern: Document outline with progress heat map, expandable accordion
- Terminal: Tree view with indicators `[100%] Section 1  [ 50%] Section 2  [  0%] Section 3`

### 7.10 DependencyGraph (Pillar 2)

**Description**: Visual dependency graph between tasks. Allows viewing the critical path and bottlenecks.

**Features**:
- Nodes = tasks, Edges = dependencies
- Node color by status (green/yellow/red/gray)
- Critical path highlight (longest path)
- Blocked tasks pulse in red
- Zoom/pan/drag
- Click on node opens task details
- Auto-layout (dagre or elk algorithm)
- Filter by sprint

**Theme variations**:
- Pixel: Dungeon map, tasks are rooms, dependencies are corridors, blocked rooms have locked doors
- Modern: Clean graph Mermaid/D3 style, bezier curves, elegant labels
- Terminal: ASCII graph with box-drawing characters and arrows `-->` `-->`

### 7.11 BurndownChart (Pillar 2)

**Description**: Classic burndown chart showing remaining tasks vs time.

**Features**:
- X axis = time (hours/days), Y axis = remaining tasks
- Ideal line (linear) vs actual line
- Area between ideal and actual colored (green = ahead, red = behind)
- Markers for events (sprint start, sprint end, agent added)
- Tooltip with details on hover
- Toggle: burndown (remaining) vs burnup (completed)
- Scope changes visible (when tasks are added/removed)

**Theme variations**:
- Pixel: Pixelated chart mini-game style, sprint "HP bar" decreasing
- Modern: Smooth area chart with gradients, responsive, animated
- Terminal: ASCII sparkline `Tasks: 12 ▇▇▇▆▆▅▅▄▃▃▂▁ 0` with annotations

### 7.12 ProjectSelector (Pillar 2)

**Description**: Switcher between projects and view mode (Agent Monitor vs PRD Tracker vs Combined).

**Features**:
- Dropdown with project list
- 3 view modes:
  - **Monitor**: Focus on Pillar 1 (activity feed, agent panel, file watcher)
  - **Tracker**: Focus on Pillar 2 (kanban, burndown, dependency graph)
  - **Mission Control**: Both side by side (split layout)
- Project indicators: name, active sprint, % progress, active agents
- Quick stats in each dropdown item
- Keyboard shortcut to switch (Ctrl+P / `:project`)

**Theme variations**:
- Pixel: RPG-style "save slot" selection menu, each project is a slot
- Modern: Raycast/Spotlight style command palette with search
- Terminal: `:project list` and `:project switch <name>`

### 7.13 AgentMap v2 - "Mission Floor" (CORE FEATURE)

**Description**: Interactive real-time pixel art visualization where Claude Code agents are represented as characters with distinct poses per activity, organized in a hierarchical open space. This is the **core product feature** - what differentiates CAM from any other monitoring tool. Inspired by OPES Big Brother.

> **IMPORTANT**: The Agent Map is NOT a theme. It's a core component that lives within any theme. It's the main visualization the user sees when opening the dashboard.

> **ARCHITECTURAL DECISION (v2)**: The previous "fixed zones" model (Code Zone, Command Zone, Rest Area, Done Zone) was abandoned. Fixed zones waste space with inactive agents and add a layer of abstraction that hinders real observability. The new "Mission Floor" model is an open space where agents exist as autonomous entities, and relevant information (what each one IS DOING now) is displayed directly on each agent.

**Visual Concept - Mission Floor**:
```
+================================================================+
|  MISSION FLOOR                                    [3 active]   |
|                                                                 |
|  [sprite 48px]          [sprite 48px]         [sprite 48px]    |
|  pose: CODING           pose: READING         pose: TERMINAL   |
|  main                   explorer-1            test-writer      |
|  "editing App.tsx"      "reading schema.sql"  "$ pnpm test"   |
|  Edit > Read > Bash     Read > Glob > Grep    Bash > Read     |
|       \                      /                                  |
|        ------msg----------->                                   |
|                                                                 |
|  --- inactive ------------------------------------------------ |
|  [mini] explorer-2 done 2m ago  |  [mini] researcher idle 45s |
+================================================================+
```

**Core principle**: Every pixel serves observability. No wasted space on inactive agents. What matters is SEEING what each agent is doing RIGHT NOW.

#### Layout: 2 areas

| Area | Space | Content |
|------|-------|---------|
| **Active Workspace** | ~80% | Working agents with large sprites, activity labels, tool trail, communication lines |
| **Inactive Bar** | ~20% (bottom) | Idle/done agents in miniature with last visible state |

- Agents **rise** to the workspace when they receive activity
- Agents **descend** to the inactive bar when idle > 30s or completed
- Animated transition between the two areas
- Main agent positioned at center, subagents around it (visual hierarchy)

#### Sprite System: Poses by Activity

Sprites rendered in CSS pixel art (box-shadow) at 24x24 pixels with 2x display = 48x48px.
Each agent has a unique color derived from its name (hash -> palette of 12 colors).

**8 distinct poses mapped by tool usage**:

| Pose | Triggering tools | Visual (24x24 pixel art) | Description |
|------|-----------------|--------------------------|-------------|
| **CODING** | Edit, Write, NotebookEdit | Sitting at desk, typing, code particles | Agent editing/writing code |
| **READING** | Read, Glob, Grep | Holding open book/scroll | Agent reading/exploring codebase |
| **TERMINAL** | Bash | Standing in front of green monitor | Agent executing commands |
| **TALKING** | SendMessage | Pose with active speech balloon | Agent communicating |
| **SEARCHING** | WebSearch, WebFetch | With glowing magnifying glass, globe | Agent searching the web |
| **MANAGING** | TaskCreate, TaskUpdate, TaskList, TaskGet | In front of a board | Agent managing tasks |
| **IDLE** | (inactive > 30s) | Sitting on floor, zZz floating | Agent resting |
| **CELEBRATING** | completed/shutdown | Arms up, pixelated confetti | Agent that finished work |

Each pose has 2-3 animation frames (continuous loop).
Transition between poses: 300ms crossfade.

#### Activity Labels

Text below the sprite showing exactly what the agent is doing:

| Tool | Generated label | Example |
|------|-------------|---------|
| Read | `reading <filename>` | "reading schema.sql" |
| Glob | `searching <pattern>` | "searching *.tsx" |
| Grep | `grep "<pattern>"` | `grep "AgentZone"` |
| Edit | `editing <filename>` | "editing index.ts" |
| Write | `writing <filename>` | "writing new-file.ts" |
| Bash | `$ <command>` | "$ pnpm test" |
| SendMessage | `msg -> <recipient>` | "msg -> researcher" |
| TaskCreate | `creating task` | "creating task" |
| WebSearch | `search "<query>"` | `search "react hooks"` |
| (idle) | `idle <N>s` | "idle 45s" |
| (done) | `completed` / `shutdown` | "completed" |

#### Agent Card (each active agent)

```
+--[agent-card]-------------------------+
|  [sprite 48x48]                       |
|  pose: CODING                         |
|                                       |
|  main                  active 2m 15s  |
|  "editing App.tsx"                    |
|  [Edit] [Read] [Bash] [Edit] [Read]  |
|  12 tools | 0 errors                  |
+---------------------------------------+
```

Card components:
- **Sprite** with animated pose (48x48 display)
- **Name** of the agent (bold, agent color)
- **Activity label** (monospace, 10px, what it's doing)
- **Tool trail** (last 5 tools as colored mini badges)
- **Stats** compact (total tools, errors, active time)
- **Timer** (active for X min or idle Xs)

#### Visual Communication

- **Message lines**: Animated SVG dashed lines between agents exchanging SendMessage, colored by sender agent
- **Spawn animation**: when subagent is created, sprite spawns with scale effect (0 -> 1) from the parent agent's position
- **Shutdown animation**: sprite shrinks and smoothly descends to the inactive bar
- **Hierarchy lines**: thin dotted lines connecting parent agent to its children (who spawned whom)
- **Speech bubbles**: pixel art balloon with message preview (60 chars) that appears for 5s

#### Positioning

Active agents are positioned in the workspace using hierarchical logic:
- **Main agent**: horizontally centered, slightly above vertical center
- **1st-level subagents**: distributed in a semicircle around main
- **2nd-level subagents**: close to the parent that spawned them
- When there are only 1-2 agents: centered with spacing
- When there are 5+ agents: responsive grid filling the workspace

#### Required Data (already captured by hooks)

- `agent_id` + `status` -> which agent, in which state
- `tool` + `input` (from events) -> determines the pose + activity label
- `SendMessage` events -> communication lines + speech bubbles
- `Task` tool calls -> agent spawning, hierarchy
- Timestamps -> active time, idle detection
- `agent_created` SSE event -> spawn animation
- `agent_status` SSE event -> state transitions

#### Technical Implementation

- **Rendering**: CSS pixel art (box-shadow) for sprites + CSS Flexbox for layout + SVG for lines
- **State**: Zustand `agent-map-store` with positions, poses, labels, hierarchy
- **Sync**: `use-agent-map-sync` hook that maps events -> poses + labels
- **Poses**: Each pose defined as a 2D array of color indices, rendered via box-shadow
- **Transitions**: CSS transitions (300ms) for movement between areas, crossfade for pose changes
- **SSE integration**: SSE events update state -> components react
- **Responsive**: Workspace reorganizes at breakpoints (4 cols -> 2 cols -> 1 col)
- **Performance**: React.memo on sprites, debounce on sync, max 60fps
- **Interactivity**: Click on agent opens AgentDetail side panel

#### Required API (already existing)

- `GET /api/sessions/:id/agents` - lists agents and status
- `GET /api/stream` (SSE) - real-time events + `agent_created` + `agent_status`
- `GET /api/sessions/:id/events?agent_id=X` - agent history

---

## 8. Visual Themes

### 8.1 Pixel Art Theme ("Retro")

**Concept**: Game Boy / 90s RPG style dashboard. Each agent is a pixel art character with state animations.

**Visual**:
- Background: Dark grid with subtle scan lines
- Font: Pixelated monospace (Press Start 2P or similar)
- Colors: Palette limited to 16 colors (NES style)
- Borders: Pixel borders (box-shadow steps)
- Agents: 32x32 sprites with idle/working/error/done animations
- Progress bar: Heart/star that fills pixel by pixel
- Notifications: RPG dialogue balloons

**Agent Sprites (states)**:
| State | Animation |
|-------|-----------|
| `idle` | Character standing still, blinking |
| `working` | Hammering/typing, code particles |
| `error` | Red exclamation blinking, character shaking |
| `completed` | Celebration with pixelated confetti |
| `shutdown` | Character lies down and sleeps (zzZ) |

**Layout**:
- Top: Game-style status bar (HP/MP = progress/memory)
- Center: "Map" where agents move between "rooms" (tasks)
- Bottom: RPG terminal style log ("Agent-1 used Edit! It's super effective!")
- Sidebar: Inventory = list of modified files

### 8.2 Modern Theme ("Clean")

**Concept**: Minimalist and professional dashboard, inspired by Linear/Vercel/Raycast.

**Visual**:
- Background: `#0a0a0a` with subtle gradients
- Font: Inter/Geist (system)
- Colors: Neutrals + configurable accent color
- Borders: 1px borders with smooth border-radius
- Cards: Subtle glassmorphism with backdrop-blur
- Motion: Framer Motion for smooth transitions
- Charts: Clean area charts for timeline

**Layout**:
- Top bar: Session info + elapsed time + agent count
- Left sidebar: Agent list with status dots (green/yellow/red)
- Center: Real-time activity feed (visual git log style)
- Right panel: Selected agent details (tool calls, files, messages)
- Bottom: Mini agent timeline/gantt

**Specific components**:
- Agent cards with generated avatar (identicon/gradient)
- Activity feed with icons per tool type
- File tree with modified file highlights
- Inline diff viewer for recent changes
- Toast notifications for important events

### 8.3 Terminal Theme ("Hacker")

**Concept**: 100% text interface, htop/lazygit/terminal multiplexer style. For those who live in the terminal.

**Visual**:
- Background: Pure black `#000000`
- Font: JetBrains Mono / Fira Code
- Colors: Phosphorescent green (#00ff00) primary, amber (#ffaa00) warnings, red (#ff0000) errors
- No rounded borders - everything straight, box-drawing characters
- Optional CRT effect (curvature + scan lines + flicker)
- ASCII art for headers and separators

**Layout (tmux-style panels)**:
```
+--[Agents]--+--[Activity Log]--+--[Details]--+
| AG-1: work | 14:23 AG-1 Edit  | Tool: Edit   |
| AG-2: idle | 14:23 AG-1 Read  | File: src/.. |
| AG-3: done | 14:22 AG-2 Bash  | Duration: 3s |
+------------+-----------+------+--------------+
| [Task List]            | [File Watcher]       |
| [ ] Task 1 (AG-1)     | M src/index.ts       |
| [x] Task 2 (AG-3)     | A src/new-file.ts    |
| [ ] Task 3 (blocked)  | M package.json       |
+------------------------+----------------------+
```

**Characteristics**:
- Keyboard-only navigation (vim keys: j/k/h/l)
- Resizable panels with drag
- Filters by event type (`:filter tool:Edit`)
- Text search in logs (`:search pattern`)
- Auto-scroll with toggle (`f` key = follow mode)
- ASCII sparklines for metrics

---

## 9. Setup / Install Flow

### 9.1 Global Installation

```bash
# Via npm
npm install -g claude-agent-monitor

# Via pnpm
pnpm add -g claude-agent-monitor

# Via bun
bun add -g claude-agent-monitor
```

This installs two binaries:
- `cam` - Main CLI (start server, init hooks, open dashboard)
- `cam-hook` - Lightweight binary called by hooks (only POSTs)

### 9.2 Project Initialization

```bash
cd /meu/projeto
cam init
```

What `cam init` does:
1. Detects if `.claude/settings.json` exists
2. If yes, merges hooks (preserves existing hooks)
3. If not, creates the file with all hooks configured
4. Shows summary of what was configured
5. Tests connectivity with the server (if running)

**Output**:
```
Claude Agent Monitor - Initializing...

  Created .claude/settings.json
  Configured 7 hooks:
    - PreToolUse (all tools)
    - PostToolUse (all tools)
    - Notification
    - Stop
    - SubagentStop
    - PreCompact
    - PostCompact

  Run 'cam start' to launch the monitoring server.
```

### 9.2.1 Initialization with PRD (Pillar 2)

```bash
cd /meu/projeto
cam init --prd ./PRD.md
```

What `cam init --prd` does (in addition to normal init):
1. Reads the PRD file
2. Parses into tasks (auto-detected method or `--parse structured|ai|manual`)
3. Creates the project in the local database
4. Shows preview of extracted tasks and asks for confirmation
5. Creates suggested sprint(s)

**Output**:
```
Claude Agent Monitor - Initializing with PRD...

  Hooks configured (7 hooks)
  PRD parsed: ./PRD.md (structured mode)

  Project: "my-awesome-app"
  Found 12 tasks in 3 sections:

  Sprint 1 - MVP (8 tasks):
    [1] Auth module               priority:high  complexity:7
    [2] Dashboard layout           priority:high  complexity:5
    [3] API endpoints              priority:high  complexity:6
    ...

  Sprint 2 - Polish (4 tasks):
    [9] Dark mode                  priority:low   complexity:3
    ...

  Accept this breakdown? [Y/n/edit]
```

### 9.3 Starting the Server + Dashboard

```bash
cam start
```

What `cam start` does:
1. Starts the Node.js server on port 7890 (configurable with `--port`)
2. Starts the web dashboard on port 7891 (configurable with `--dashboard-port`)
3. Opens the browser automatically (configurable with `--no-open`)
4. Creates initial session
5. Shows dashboard URL

**Output**:
```
Claude Agent Monitor v1.0.0

  Server:    http://localhost:7890
  Dashboard: http://localhost:7891
  Session:   cam_abc123

  Waiting for Claude Code events...
  (Press Ctrl+C to stop)
```

### 9.4 Other CLI Commands

```bash
# === Server & Dashboard ===
cam start                    # Starts server + dashboard
cam start --port 8080        # Custom port
cam start --theme terminal   # Starts with specific theme
cam start --no-open          # Don't open browser

# === Init & Hooks ===
cam init                     # Configure hooks in the project
cam init --prd ./PRD.md      # Configure hooks + import PRD
cam init --prd ./PRD.md --parse ai   # Parse with AI
cam init --force             # Overwrite existing hooks

# === Monitoring ===
cam status                   # Shows if server is running + stats
cam sessions                 # Lists previous sessions
cam sessions --clear         # Clears history

cam hooks --list             # Shows configured hooks
cam hooks --remove           # Removes CAM hooks (preserves others)
cam hooks --test             # Sends a test event

# === Themes ===
cam theme pixel              # Switch theme
cam theme modern
cam theme terminal

# === PRD & Projects (Pillar 2) ===
cam project list             # Lists projects
cam project show             # Shows active project with stats
cam project import PRD.md    # Imports PRD into existing project
cam project archive          # Archives project

cam sprint list              # Lists sprints of active project
cam sprint create "Sprint 2" # Creates sprint
cam sprint status            # Active sprint progress in terminal
cam sprint activate <id>     # Sets active sprint

cam tasks                    # Lists tasks from active sprint
cam tasks --all              # Lists all project tasks
cam tasks --blocked          # Shows blocked tasks
cam tasks --agent researcher # Tasks for a specific agent

cam progress                 # Mini burndown in terminal
cam progress --full          # Detailed progress report

# === General ===
cam --version                # Version
cam --help                   # Help
```

### 9.5 Full Flow (Pillar 1 - Monitoring Only)

```bash
# 1. Install globally (once)
npm install -g claude-agent-monitor

# 2. Configure hooks in the project
cd /my/project
cam init

# 3. Start the monitor
cam start

# 4. In another terminal, use Claude Code normally
claude "implement auth module using a team of 3 agents"

# 5. Dashboard shows agent activity in real-time!
# 6. When done, Ctrl+C on cam start
```

### 9.6 Full Flow (Pillar 1 + 2 - Mission Control)

```bash
# 1. Install globally (once)
npm install -g claude-agent-monitor

# 2. Configure hooks + import PRD
cd /my/project
cam init --prd ./PRD.md

# 3. Review tasks extracted from the PRD (interactive)
# → Confirm breakdown into tasks and sprints

# 4. Start the monitor in Mission Control mode
cam start

# 5. In another terminal, use Claude Code with the PRD
claude "read the PRD.md and implement all tasks using a team of agents"

# 6. Dashboard shows EVERYTHING:
#    - Left: Kanban with tasks moving on their own
#    - Right: Real-time feed of what each agent does
#    - Top: Sprint progress bar + stats
#    - Bottom: Timeline/Gantt of who did what

# 7. When done, complete execution report
cam progress --full
```

---

# PART 3 - EXECUTION (WHEN to build)

> **Note**: Detailed task tracking and context for each sprint lives in the sprint files at `docs/SPRINTS/`.
> Use `cam sprint import docs/SPRINTS/sprint-XX.md` to import tasks into the database.

---

## 10. MVP - v1.0 "Mission Control"

Local server + Web dashboard + both Pillars + Agent Map Mission Floor + 3 themes + full CLI + npm packaging + plug-and-play developer experience.

| Sprint | Name | Tasks | Status | Sprint File |
|--------|------|-------|--------|-------------|
| 1 | Core Infrastructure | 29 | Completed | [sprint-01.md](../SPRINTS/sprint-01.md) |
| 2 | Agent Map v1 | 10 | Completed (replaced by Sprint 4) | [sprint-02.md](../SPRINTS/sprint-02.md) |
| 3 | SSE Pillar 2 | 2 | Completed | [sprint-03.md](../SPRINTS/sprint-03.md) |
| 4 | Agent Map v2: Mission Floor | 16 | Completed | [sprint-04.md](../SPRINTS/sprint-04.md) |
| 5 | Developer Experience & Plug-and-Play | 15 | Completed | [sprint-05.md](../SPRINTS/sprint-05.md) |
| 6 | True Observability | 11 | Completed (10/11) | [sprint-06.md](../SPRINTS/sprint-06.md) |
| 7 | Correlation Engine v2 | 17 | Completed (14/17, 3 deferred) | [sprint-07.md](../SPRINTS/sprint-07.md) |
| 8 | Project-First Architecture | 12 | Completed | [sprint-08.md](../SPRINTS/sprint-08.md) |
| 9 | Dashboard Experience | 16 | Completed | [sprint-09.md](../SPRINTS/sprint-09.md) |
| 10 | Visual Polish | 10 | Completed | [sprint-10.md](../SPRINTS/sprint-10.md) |
| 11 | Real User Polish | 18 | Completed | [sprint-11.md](../SPRINTS/sprint-11.md) |
| 12 | Docs Restructure & tmux-First | 11 | Planned | [sprint-12.md](../SPRINTS/sprint-12.md) |

---

## 11. Backlog

### v1.1 - "Intelligence" (14 tasks)

- Session/project export (JSON, CSV, Markdown report)
- Inline diff viewer
- Dark/Light mode in Modern theme
- Performance profiling (which tools are slowest)
- Comparison between sessions/sprints
- AI-assisted PRD parser with complexity estimation
- CLAUDE.md template with TaskTools instructions
- Active task detection hook
- Automatic dependency suggestions between tasks
- PRD/Workflow template for open-source distribution
- PreToolUseRejected handler in @claudecam/hook
- ToolError handler in @claudecam/hook
- Keyboard navigation (vim keys) in Terminal theme

### v2.0 - "Desktop App"

Native desktop app with Tauri: system tray with status, native OS notifications, auto-detect Claude Code sessions, auto-start on login. Distribution via `.dmg` / `.msi` / `.AppImage`.

### v3.0 - "VS Code Extension"

VS Code extension with integrated panel: activity feed as VS Code panel, status bar item, click-to-open on modified files, file decorators, command palette integration. Published on the Marketplace.

### v4.0 - "Multi-machine"

Centralized server (cloud), API key authentication, multi-user dashboard, persistent history (PostgreSQL), configurable alerts (Slack/Discord/email), estimated cost metrics (tokens).

---

# PART 4 - REFERENCE

---

## 12. File Structure

```
claude-agent-monitor/
|
|-- package.json              # Monorepo root
|-- pnpm-workspace.yaml       # Workspace config
|-- tsconfig.base.json        # Shared TS config
|-- README.md                 # Main documentation
|-- LICENSE                   # MIT
|-- .github/
|   |-- workflows/
|       |-- ci.yml            # Build + Test + Lint
|       |-- release.yml       # npm publish
|
|-- packages/
|   |
|   |-- cli/                  # claudecam - Main CLI
|   |   |-- package.json
|   |   |-- tsconfig.json
|   |   |-- src/
|   |       |-- index.ts      # Entry point (cam binary)
|   |       |-- commands/
|   |       |   |-- init.ts   # cam init
|   |       |   |-- start.ts  # cam start
|   |       |   |-- status.ts # cam status
|   |       |   |-- sessions.ts
|   |       |   |-- hooks.ts
|   |       |   |-- theme.ts
|   |       |   |-- project.ts  # cam project (list, show, import, archive)
|   |       |   |-- sprint.ts   # cam sprint (list, create, status, activate)
|   |       |   |-- tasks.ts    # cam tasks (list, filter)
|   |       |   |-- progress.ts # cam progress (burndown terminal)
|   |       |-- utils/
|   |           |-- config.ts
|   |           |-- hooks-config.ts
|   |           |-- logger.ts
|   |
|   |-- hook/                 # @claudecam/hook - Hook binary (ultra-lightweight)
|   |   |-- package.json
|   |   |-- tsconfig.json
|   |   |-- src/
|   |       |-- index.ts      # Entry point (cam-hook binary)
|   |       |-- handlers/
|   |       |   |-- pre-tool-use.ts
|   |       |   |-- post-tool-use.ts
|   |       |   |-- notification.ts
|   |       |   |-- stop.ts
|   |       |   |-- subagent-stop.ts
|   |       |   |-- compact.ts
|   |       |-- transport.ts  # HTTP POST to server
|   |
|   |-- server/               # @claudecam/server - Backend
|   |   |-- package.json
|   |   |-- tsconfig.json
|   |   |-- src/
|   |       |-- index.ts      # Express/Fastify app
|   |       |-- routes/
|   |       |   |-- events.ts     # POST /api/events
|   |       |   |-- sessions.ts   # GET/DELETE /api/sessions
|   |       |   |-- agents.ts     # GET /api/sessions/:id/agents
|   |       |   |-- files.ts      # GET /api/sessions/:id/files
|   |       |   |-- stats.ts      # GET /api/sessions/:id/stats
|   |       |   |-- stream.ts     # GET /api/stream (SSE)
|   |       |   |-- projects.ts   # CRUD /api/projects (Pillar 2)
|   |       |   |-- sprints.ts    # CRUD /api/projects/:id/sprints (Pillar 2)
|   |       |   |-- tasks.ts      # CRUD /api/projects/:id/tasks (Pillar 2)
|   |       |   |-- parse-prd.ts  # POST /api/parse-prd (Pillar 2)
|   |       |-- db/
|   |       |   |-- index.ts      # SQLite setup
|   |       |   |-- schema.sql    # Table definitions (both pillars)
|   |       |   |-- queries.ts    # Prepared statements
|   |       |-- services/
|   |       |   |-- event-processor.ts     # Processes + enriches events
|   |       |   |-- sse-manager.ts         # Manages SSE connections
|   |       |   |-- session-manager.ts     # Session CRUD
|   |       |   |-- correlation-engine.ts  # Links events to PRD tasks (Pillar 2)
|   |       |   |-- prd-parser.ts          # Parses PRD into tasks (Pillar 2)
|   |       |   |-- project-manager.ts     # Project/sprint CRUD (Pillar 2)
|   |       |-- types.ts
|   |
|   |-- dashboard/            # @claudecam/dashboard - Frontend React
|   |   |-- package.json
|   |   |-- tsconfig.json
|   |   |-- vite.config.ts
|   |   |-- index.html
|   |   |-- src/
|   |       |-- main.tsx
|   |       |-- App.tsx
|   |       |-- stores/
|   |       |   |-- session-store.ts    # Zustand store - active session
|   |       |   |-- theme-store.ts      # Selected theme
|   |       |   |-- filter-store.ts     # Active filters
|   |       |   |-- project-store.ts    # Active project/sprint (Pillar 2)
|   |       |   |-- kanban-store.ts     # Kanban state (Pillar 2)
|   |       |   |-- agent-map-store.ts  # Agent Map state (zones, agents, animations)
|   |       |-- hooks/
|   |       |   |-- use-sse.ts          # Hook for SSE connection
|   |       |   |-- use-session.ts      # Session data
|   |       |   |-- use-agents.ts       # Agent list
|   |       |   |-- use-events.ts       # Event feed
|   |       |   |-- use-project.ts      # Project data (Pillar 2)
|   |       |   |-- use-sprint.ts       # Sprint data (Pillar 2)
|   |       |   |-- use-tasks.ts        # PRD tasks (Pillar 2)
|   |       |   |-- use-agent-map-sync.ts # Bridge session-store -> agent-map-store
|   |       |-- components/
|   |       |   |-- agent-map/          # CORE FEATURE - Agent Map (shared across themes)
|   |       |   |   |-- AgentMap.tsx    # Main map component
|   |       |   |   |-- AgentSprite.tsx # Agent pixel art sprite (CSS box-shadow)
|   |       |   |   |-- MapZone.tsx     # Activity zone (Code, Command, Comms, etc.)
|   |       |   |   |-- MapLayout.tsx   # Layout wrapper used by all themes
|   |       |   |   |-- InteractionLine.tsx  # Communication lines between agents
|   |       |   |   |-- SpeechBubble.tsx     # Speech balloons
|   |       |   |-- layout/
|   |       |   |   |-- Shell.tsx       # Layout shell (varies by theme)
|   |       |   |   |-- ThemeSwitcher.tsx
|   |       |   |-- shared/
|   |       |   |   |-- # Pillar 1 - Agent Monitor
|   |       |   |   |-- AgentPanel.tsx
|   |       |   |   |-- ActivityFeed.tsx
|   |       |   |   |-- FileWatcher.tsx
|   |       |   |   |-- StatsBar.tsx
|   |       |   |   |-- AgentDetail.tsx
|   |       |   |   |-- SessionTimeline.tsx
|   |       |   |   |-- # Pillar 2 - PRD Tracker
|   |       |   |   |-- KanbanBoard.tsx
|   |       |   |   |-- SprintProgress.tsx
|   |       |   |   |-- PRDOverview.tsx
|   |       |   |   |-- DependencyGraph.tsx
|   |       |   |   |-- BurndownChart.tsx
|   |       |   |   |-- ProjectSelector.tsx
|   |       |   |-- themes/
|   |       |       |-- pixel/
|   |       |       |   |-- PixelShell.tsx
|   |       |       |   |-- # Pillar 1
|   |       |       |   |-- PixelAgentPanel.tsx
|   |       |       |   |-- PixelActivityFeed.tsx
|   |       |       |   |-- PixelFileWatcher.tsx
|   |       |       |   |-- PixelStatsBar.tsx
|   |       |       |   |-- PixelAgentDetail.tsx
|   |       |       |   |-- PixelTimeline.tsx
|   |       |       |   |-- # Pillar 2
|   |       |       |   |-- PixelKanban.tsx
|   |       |       |   |-- PixelSprintProgress.tsx
|   |       |       |   |-- PixelPRDOverview.tsx
|   |       |       |   |-- PixelDependencyGraph.tsx
|   |       |       |   |-- PixelBurndown.tsx
|   |       |       |   |-- PixelProjectSelector.tsx
|   |       |       |   |-- sprites/          # PNG sprites for agents
|   |       |       |   |-- pixel.css
|   |       |       |-- modern/
|   |       |       |   |-- ModernShell.tsx
|   |       |       |   |-- # Pillar 1
|   |       |       |   |-- ModernAgentPanel.tsx
|   |       |       |   |-- ModernActivityFeed.tsx
|   |       |       |   |-- ModernFileWatcher.tsx
|   |       |       |   |-- ModernStatsBar.tsx
|   |       |       |   |-- ModernAgentDetail.tsx
|   |       |       |   |-- ModernTimeline.tsx
|   |       |       |   |-- # Pillar 2
|   |       |       |   |-- ModernKanban.tsx
|   |       |       |   |-- ModernSprintProgress.tsx
|   |       |       |   |-- ModernPRDOverview.tsx
|   |       |       |   |-- ModernDependencyGraph.tsx
|   |       |       |   |-- ModernBurndown.tsx
|   |       |       |   |-- ModernProjectSelector.tsx
|   |       |       |   |-- modern.css
|   |       |       |-- terminal/
|   |       |           |-- TerminalShell.tsx
|   |       |           |-- # Pillar 1
|   |       |           |-- TerminalAgentPanel.tsx
|   |       |           |-- TerminalActivityFeed.tsx
|   |       |           |-- TerminalFileWatcher.tsx
|   |       |           |-- TerminalStatsBar.tsx
|   |       |           |-- TerminalAgentDetail.tsx
|   |       |           |-- TerminalTimeline.tsx
|   |       |           |-- # Pillar 2
|   |       |           |-- TerminalKanban.tsx
|   |       |           |-- TerminalSprintProgress.tsx
|   |       |           |-- TerminalPRDOverview.tsx
|   |       |           |-- TerminalDependencyGraph.tsx
|   |       |           |-- TerminalBurndown.tsx
|   |       |           |-- TerminalProjectSelector.tsx
|   |       |           |-- terminal.css
|   |       |-- lib/
|   |       |   |-- api.ts              # HTTP client for server
|   |       |   |-- sse.ts              # SSE client
|   |       |   |-- formatters.ts       # Data formatters
|   |       |   |-- theme-registry.ts   # Theme registry
|   |       |-- types/
|   |           |-- events.ts
|   |           |-- agents.ts
|   |           |-- sessions.ts
|   |           |-- themes.ts
|   |           |-- projects.ts    # Pillar 2
|   |           |-- tasks.ts       # Pillar 2
|   |
|   |-- shared/               # @claudecam/shared - Shared types
|       |-- package.json
|       |-- tsconfig.json
|       |-- src/
|           |-- types/
|           |   |-- events.ts     # AgentEvent, HookType, EventCategory
|           |   |-- agents.ts     # Agent, AgentStatus
|           |   |-- sessions.ts   # Session
|           |   |-- files.ts      # FileChange
|           |   |-- projects.ts   # Project, Sprint, PRDTask (Pillar 2)
|           |   |-- correlation.ts # TaskActivity, correlation types (Pillar 2)
|           |   |-- agent-map.ts  # AgentMapState, MapZone, SpriteState
|           |   |-- index.ts      # re-exports
|           |-- constants.ts  # Default ports, timeouts, etc.
|           |-- schemas.ts    # Zod schemas for validation (both pillars)
|
|-- docs/
|   |-- architecture.md       # Detailed architecture diagram
|   |-- hooks.md              # Hooks documentation
|   |-- themes.md             # Theme creation guide
|   |-- api.md                # API reference
|
|-- examples/
    |-- basic/                # Basic setup example
    |-- team/                 # Agent team example
    |-- custom-theme/         # Custom theme example
```

---

## Appendix A: Technical Decisions

| # | Question | Decision | Status |
|---|----------|----------|--------|
| 1 | Server framework | **Express** | Implemented |
| 2 | Hook binary bundling | **esbuild** (tsc build) | Implemented |
| 3 | Persistence | **SQLite** (better-sqlite3, WAL mode) | Implemented |
| 4 | Pixel theme sprites | **CSS box-shadow pixel art** (16x16, 3 frames) | Implemented |
| 5 | Monorepo tool | **pnpm workspaces** | Implemented |
| 6 | Keyboard nav in Terminal theme | **Custom** | Implemented |
| 7 | Graph layout (DependencyGraph) | TBD | Open |
| 8 | Kanban drag & drop | TBD | Open |
| 9 | AI PRD parser | TBD (deferred to v1.1) | Open |
| 10 | Fuzzy matching (Correlation Engine) | TBD | Open |

## Appendix B: Success Metrics

**Pillar 1 - Agent Monitor**:
| Metric | Target |
|--------|--------|
| Hook latency (POST) | < 10ms (must not impact Claude Code) |
| SSE latency (server -> browser) | < 50ms |
| Server memory | < 100MB for 1h sessions |
| Setup time | < 2 minutes (install + init + start) |
| Dashboard render | 60fps with 1000+ events |
| Bundle size (hook binary) | < 500KB |
| npm install time | < 30s |

**Pillar 2 - PRD Tracker**:
| Metric | Target |
|--------|--------|
| PRD parse time (structured) | < 1s for 500-line PRDs |
| PRD parse time (AI-assisted) | < 15s for 500-line PRDs |
| Correlation accuracy (auto mode) | > 85% correct event -> task match |
| Kanban update latency | < 200ms after hook event |
| Simultaneous projects | Support 10+ projects without degradation |
| Tasks per project | Support 200+ tasks without dashboard degradation |

## Appendix C: Security

- Server runs **only on localhost** (do not expose to network)
- No authentication in MVP (localhost-only = secure)
- Hook binary does not send data to any external server
- Tool inputs/outputs are **truncated** (500 chars) to prevent sensitive data leaks
- `--redact` option to hide file contents in logs
- SQLite database is local, no data leaves the machine

---

*Document generated on 2026-02-14. Version 3.0.0.*
*Updated with Pillar 2 (PRD Tracker) on 2026-02-14.*
*Reorganized: simplified roadmap, granular tracking via DB (dogfooding) on 2026-02-16.*
*Restructured: 4-part template (PRD/SPEC/EXECUTION/REFERENCE) on 2026-02-16.*
