import { randomUUID } from "node:crypto";
import type { AgentEvent, EventCategory, HookType } from "@cam/shared";
import {
  FILE_CHANGE_TOOLS,
  FILE_READ_TOOLS,
  COMMAND_TOOLS,
  MESSAGE_TOOLS,
  MAX_INPUT_LENGTH,
  MAX_OUTPUT_LENGTH,
} from "@cam/shared";
import {
  eventQueries,
  agentQueries,
  sessionQueries,
  fileChangeQueries,
  taskItemQueries,
} from "../db/queries.js";
import { sseManager } from "./sse-manager.js";
import {
  bindSessionToProject,
  getProjectForSession,
  getSessionsForProject,
} from "./project-router.js";
import {
  autoCompleteTasksForSession,
  autoCompleteTasksForAgent,
  markPrdTaskCompleted,
} from "./task-completion.js";
import {
  prdTaskQueries,
  agentTaskBindingQueries,
} from "../db/queries.js";

/**
 * Track spawned subagents per session for SubagentStop correlation.
 * When a Task tool is detected, we create a virtual agent and queue its ID.
 * When SubagentStop fires, we dequeue the oldest virtual agent (FIFO).
 */
const spawnedSubagentQueue = new Map<string, string[]>();

/**
 * Queue of pending agent names from Task tool calls.
 * When main agent spawns a subagent via Task tool with a `name` parameter,
 * we queue that name. When a new SessionStart arrives (the subagent starting),
 * we dequeue and assign the name to that session's agent.
 */
const pendingAgentNames: string[] = [];

/** Stale session timeout (ms). Sessions inactive for this long are marked completed. */
const STALE_SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/** Interval (ms) for running the stale session cleanup. */
export const STALE_SESSION_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/** Window (ms) for retroactive agent name updates. Agents created within this window can be renamed. */
const RETROACTIVE_NAME_WINDOW_MS = 30 * 1000;

interface IncomingEvent {
  hook: HookType;
  timestamp?: string;
  session_id?: string;
  agent_id?: string;
  data?: Record<string, unknown>;
  tool?: string;
  input?: unknown;
}

function truncate(val: unknown, maxLen: number): string | undefined {
  if (val === undefined || val === null) return undefined;
  const str = typeof val === "string" ? val : JSON.stringify(val);
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "...";
}

function categorizeEvent(hookType: HookType, toolName?: string): EventCategory {
  if (hookType === "Notification") return "notification";
  if (hookType === "PreCompact" || hookType === "PostCompact") return "compact";
  if (
    hookType === "Stop" ||
    hookType === "SubagentStop" ||
    hookType === "SubagentStart" ||
    hookType === "SessionStart" ||
    hookType === "SessionEnd" ||
    hookType === "UserPromptSubmit"
  )
    return "lifecycle";
  if (
    hookType === "ToolError" ||
    hookType === "PreToolUseRejected" ||
    hookType === "PostToolUseFailure"
  )
    return "error";

  if (toolName) {
    if ((FILE_CHANGE_TOOLS as readonly string[]).includes(toolName))
      return "file_change";
    if ((COMMAND_TOOLS as readonly string[]).includes(toolName))
      return "command";
    if ((MESSAGE_TOOLS as readonly string[]).includes(toolName))
      return "message";
  }

  return "tool_call";
}

function extractFilePath(
  toolName: string | undefined,
  data: Record<string, unknown> | undefined,
  input: unknown,
): string | undefined {
  if (!data && !input) return undefined;

  const sources = [
    data,
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : undefined,
  ];

  for (const src of sources) {
    if (!src) continue;

    // Check top-level file_path first (hook sends it directly in data)
    const directPath = src["file_path"] ?? src["path"] ?? src["filePath"];
    if (typeof directPath === "string") return directPath;

    // Check inside tool_input
    let toolInput = src["tool_input"];

    // If tool_input is a string (serialized JSON), parse it
    if (typeof toolInput === "string") {
      try {
        toolInput = JSON.parse(toolInput);
      } catch {
        continue;
      }
    }

    if (typeof toolInput === "object" && toolInput !== null) {
      const ti = toolInput as Record<string, unknown>;
      const path = ti["file_path"] ?? ti["path"] ?? ti["filePath"];
      if (typeof path === "string") return path;
    }
  }

  return undefined;
}

function extractToolName(incoming: IncomingEvent): string | undefined {
  if (incoming.tool) return incoming.tool;
  if (
    incoming.data?.["tool_name"] &&
    typeof incoming.data["tool_name"] === "string"
  ) {
    return incoming.data["tool_name"];
  }
  return undefined;
}

function extractDuration(data?: Record<string, unknown>): number | undefined {
  if (!data) return undefined;
  const dur = data["duration_ms"] ?? data["duration"];
  return typeof dur === "number" ? dur : undefined;
}

function extractError(data?: Record<string, unknown>): string | undefined {
  if (!data) return undefined;
  const err = data["error_message"] ?? data["error"];
  return typeof err === "string" ? err : undefined;
}

/**
 * Broadcast an event to all sessions belonging to the same project,
 * EXCLUDING the originating session (to avoid duplicate delivery).
 */
function broadcastToProjectExcluding(
  projectId: string,
  eventType: string,
  data: unknown,
  excludeSessionId: string,
): void {
  try {
    const sessionIds = getSessionsForProject(projectId);
    for (const sid of sessionIds) {
      if (sid !== excludeSessionId) {
        sseManager.broadcast(eventType, data, sid);
      }
    }
  } catch {
    // Ignore broadcast errors (DB not ready, etc.)
  }
}

export function processEvent(incoming: IncomingEvent): AgentEvent {
  const now = new Date().toISOString();
  const sessionId = incoming.session_id || "default";
  const agentId = incoming.agent_id || "main";
  const toolName = extractToolName(incoming);
  const category = categorizeEvent(incoming.hook, toolName);

  const inputStr =
    incoming.data?.["tool_input"] ?? incoming.input ?? incoming.data;
  const outputStr = incoming.data?.["tool_output"] ?? incoming.data?.["output"];

  const event: AgentEvent = {
    id: randomUUID(),
    sessionId,
    agentId,
    timestamp: incoming.timestamp || now,
    hookType: incoming.hook,
    category,
    tool: toolName,
    filePath: extractFilePath(toolName, incoming.data, incoming.input),
    input: truncate(inputStr, MAX_INPUT_LENGTH),
    output: truncate(outputStr, MAX_OUTPUT_LENGTH),
    error: extractError(incoming.data),
    duration: extractDuration(incoming.data),
    metadata: incoming.data,
  };

  persistEvent(event, now);

  // Broadcast event to the session's own listeners
  sseManager.broadcast("agent_event", event, sessionId);

  // Cross-broadcast to all sessions in the same project
  const projectId = getProjectForSession(sessionId);
  if (projectId) {
    broadcastToProjectExcluding(projectId, "agent_event", event, sessionId);
  }

  return event;
}

function persistEvent(event: AgentEvent, now: string): void {
  // Ensure session exists
  const existingSession = sessionQueries.getById().get(event.sessionId) as
    | Record<string, unknown>
    | undefined;
  if (!existingSession) {
    const workDir =
      (event.metadata?.["working_directory"] as string) || process.cwd();
    sessionQueries
      .insert()
      .run(event.sessionId, event.timestamp, workDir, "active", 0, 0, null);
  } else if (
    existingSession["status"] === "completed" ||
    existingSession["status"] === "error"
  ) {
    // Reactivate session when new events arrive (e.g., after context compaction)
    sessionQueries.updateStatus().run("active", null, event.sessionId);
    // Re-activate the main agent too
    agentQueries.updateStatus().run("active", now, "main", event.sessionId);
    const reactivatePayload = {
      session: event.sessionId,
      status: "active",
    };
    sseManager.broadcast("session_status", reactivatePayload, event.sessionId);

    // Cross-broadcast session reactivation to project peers
    const pidReactivate = getProjectForSession(event.sessionId);
    if (pidReactivate) {
      broadcastToProjectExcluding(pidReactivate, "session_status", reactivatePayload, event.sessionId);
    }
  }

  // Bind session to project via working_directory (Project-First Architecture)
  const isNewSession = !existingSession;
  if (isNewSession || event.hookType === "SessionStart") {
    const workDir = (event.metadata?.["working_directory"] as string) || "";
    if (workDir) {
      bindSessionToProject(event.sessionId, workDir);
    }
  }

  sessionQueries.incrementEventCount().run(event.sessionId);

  // Name session from first user prompt (UserPromptSubmit)
  if (event.hookType === 'UserPromptSubmit' && event.input) {
    const currentSession = sessionQueries.getById().get(event.sessionId) as Record<string, unknown> | undefined;
    const currentMeta = currentSession?.['metadata'] ? JSON.parse(currentSession['metadata'] as string) : {};
    if (!currentMeta.name) {
      let rawText = typeof event.input === 'string' ? event.input : JSON.stringify(event.input);
      // Extract prompt from JSON wrapper: {"prompt": "actual text"}
      try {
        const parsed = JSON.parse(rawText);
        if (parsed && typeof parsed.prompt === 'string') rawText = parsed.prompt;
        else if (parsed && typeof parsed.message === 'string') rawText = parsed.message;
        else if (parsed && parsed.message?.content) rawText = parsed.message.content;
      } catch { /* not JSON, use raw */ }
      // Strip system tags (<system-reminder>, <task-notification>, etc.)
      const cleaned = rawText
        .replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, '')  // remove XML-like tags with content
        .replace(/<[^>]+>/g, '')                     // remove self-closing tags
        .replace(/^[\s#*\->`]+/, '')                 // leading markdown
        .replace(/[\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      // Extract short summary (max 30 chars at word boundary)
      const words = cleaned.split(' ');
      let sessionName = '';
      for (const word of words) {
        const candidate = sessionName ? `${sessionName} ${word}` : word;
        if (candidate.length > 30) break;
        sessionName = candidate;
      }
      if (sessionName) {
        currentMeta.name = sessionName;
        sessionQueries.updateMetadata().run(JSON.stringify(currentMeta), event.sessionId);
      }
    }
  }

  // Ensure agent exists
  const existingAgent = agentQueries
    .getById()
    .get(event.agentId, event.sessionId) as Record<string, unknown> | undefined;
  if (!existingAgent) {
    // Agent name resolution with 4 layers:
    // Layer 1: SessionStart -> "main" (this is the leader/main agent)
    // Layer 2: Pending name from Task tool queue (subagent name designated by parent)
    // Layer 3: agent_name from metadata
    // Layer 4: Fallback to agentId (dashboard generates friendly name)
    const agentType =
      (event.metadata?.["agent_type"] as string) || "general-purpose";
    const isMainAgent = event.hookType === "SessionStart";
    const pendingName = !isMainAgent && pendingAgentNames.length > 0
      ? pendingAgentNames.shift()
      : undefined;
    const agentName =
      isMainAgent
        ? "main"
        : pendingName ||
          (event.metadata?.["agent_name"] as string) ||
          event.agentId;
    agentQueries
      .upsert()
      .run(
        event.agentId,
        event.sessionId,
        agentName,
        agentType,
        "active",
        event.timestamp,
        event.timestamp,
      );

    const agents = agentQueries
      .getBySession()
      .all(event.sessionId) as unknown[];
    sessionQueries.updateAgentCount().run(agents.length, event.sessionId);

    // Emit agent_created SSE event
    const agentCreatedPayload = {
      agent: event.agentId,
      sessionId: event.sessionId,
      name: agentName,
      type: agentType,
      status: "active",
      timestamp: event.timestamp,
    };
    sseManager.broadcast("agent_created", agentCreatedPayload, event.sessionId);

    // Cross-broadcast agent_created to project peers
    const pidCreated = getProjectForSession(event.sessionId);
    if (pidCreated) {
      broadcastToProjectExcluding(pidCreated, "agent_created", agentCreatedPayload, event.sessionId);
    }
  }

  // Update agent status
  if (event.hookType === "PreToolUse" || event.hookType === "PostToolUse") {
    // Only count tool calls and broadcast status on PostToolUse
    // PreToolUse only updates lastActivityAt silently (no SSE broadcast)
    if (event.hookType === "PostToolUse") {
      agentQueries
        .incrementToolCalls()
        .run(now, event.agentId, event.sessionId);
      agentQueries
        .updateStatus()
        .run("active", now, event.agentId, event.sessionId);

      const activePayload = {
        agent: event.agentId,
        sessionId: event.sessionId,
        status: "active",
      };
      sseManager.broadcast("agent_status", activePayload, event.sessionId);

      // Cross-broadcast active status to project peers
      const pidActive = getProjectForSession(event.sessionId);
      if (pidActive) {
        broadcastToProjectExcluding(pidActive, "agent_status", activePayload, event.sessionId);
      }
    } else {
      // PreToolUse: just update timestamp, no SSE broadcast
      agentQueries
        .updateStatus()
        .run("active", now, event.agentId, event.sessionId);
    }
  }

  if (event.category === "error") {
    agentQueries.incrementErrors().run(now, event.agentId, event.sessionId);
    agentQueries
      .updateStatus()
      .run("error", now, event.agentId, event.sessionId);

    const errorPayload = {
      agent: event.agentId,
      sessionId: event.sessionId,
      status: "error",
    };
    sseManager.broadcast("agent_status", errorPayload, event.sessionId);

    // Cross-broadcast error status to project peers
    const pidError = getProjectForSession(event.sessionId);
    if (pidError) {
      broadcastToProjectExcluding(pidError, "agent_status", errorPayload, event.sessionId);
    }
  }

  if (event.hookType === "Stop") {
    agentQueries
      .updateStatus()
      .run("completed", now, event.agentId, event.sessionId);
    const completedPayload = {
      agent: event.agentId,
      sessionId: event.sessionId,
      status: "completed",
    };
    sseManager.broadcast("agent_status", completedPayload, event.sessionId);

    // Auto-complete tasks bound to this agent with high confidence
    try {
      autoCompleteTasksForAgent(event.agentId, event.sessionId);
    } catch {
      // Task completion errors should not break event processing
    }

    // Cross-broadcast completed status to project peers
    const pidCompleted = getProjectForSession(event.sessionId);
    if (pidCompleted) {
      broadcastToProjectExcluding(pidCompleted, "agent_status", completedPayload, event.sessionId);
    }

    const activeAgents = (
      agentQueries.getBySession().all(event.sessionId) as Array<
        Record<string, unknown>
      >
    ).filter((a) => a["status"] === "active");
    if (activeAgents.length === 0) {
      sessionQueries.updateStatus().run("completed", now, event.sessionId);
      const sessionCompletedPayload = {
        session: event.sessionId,
        status: "completed",
      };
      sseManager.broadcast(
        "session_status",
        sessionCompletedPayload,
        event.sessionId,
      );

      // Cross-broadcast session_status to project peers
      if (pidCompleted) {
        broadcastToProjectExcluding(pidCompleted, "session_status", sessionCompletedPayload, event.sessionId);
      }
    }
  }

  // Auto-complete tasks on SessionEnd
  if (event.hookType === "SessionEnd") {
    try {
      autoCompleteTasksForSession(event.sessionId);
    } catch {
      // Task completion errors should not break event processing
    }
  }

  if (event.hookType === "SubagentStop") {
    // Correlate with spawned virtual agents (FIFO queue)
    const queue = spawnedSubagentQueue.get(event.sessionId);
    if (queue && queue.length > 0) {
      const subagentId = queue.shift()!;
      agentQueries
        .updateStatus()
        .run("shutdown", now, subagentId, event.sessionId);
      const shutdownPayload = {
        agent: subagentId,
        sessionId: event.sessionId,
        status: "shutdown",
      };
      sseManager.broadcast("agent_status", shutdownPayload, event.sessionId);

      // Auto-complete tasks bound to this subagent with high confidence
      try {
        autoCompleteTasksForAgent(subagentId, event.sessionId);
      } catch {
        // Task completion errors should not break event processing
      }

      // Cross-broadcast shutdown status to project peers
      const pidShutdown = getProjectForSession(event.sessionId);
      if (pidShutdown) {
        broadcastToProjectExcluding(pidShutdown, "agent_status", shutdownPayload, event.sessionId);
      }
    }
    // NOTE: Do NOT mark event.agentId ('main') as shutdown - SubagentStop
    // means a SUBAGENT stopped, not the main agent.
  }

  // Detect Task tool -> create virtual subagent in Agent Map
  if (
    event.tool === "Task" &&
    event.hookType === "PostToolUse" &&
    event.metadata
  ) {
    try {
      const rawInput = event.metadata["tool_input"];
      const input =
        typeof rawInput === "string"
          ? (JSON.parse(rawInput) as Record<string, unknown>)
          : (rawInput as Record<string, unknown>);
      if (input && typeof input === "object") {
        // Prioritize the `name` field (official agent name like "sprint-dev", "researcher").
        // Do NOT use `description` as agent name -- it is a task description, not an agent identifier.
        const name =
          (input["name"] as string) ||
          "subagent";
        const type = (input["subagent_type"] as string) || "general-purpose";
        const agentId = `subagent-${name.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase()}`;

        // Create virtual agent in DB
        const existingVirtualAgent = agentQueries
          .getById()
          .get(agentId, event.sessionId) as Record<string, unknown> | undefined;
        if (!existingVirtualAgent) {
          agentQueries
            .upsert()
            .run(
              agentId,
              event.sessionId,
              name,
              type,
              "active",
              event.timestamp,
              event.timestamp,
            );

          const agents = agentQueries
            .getBySession()
            .all(event.sessionId) as unknown[];
          sessionQueries.updateAgentCount().run(agents.length, event.sessionId);

          sseManager.broadcast(
            "agent_created",
            {
              agent: agentId,
              sessionId: event.sessionId,
              name,
              type,
              status: "active",
              timestamp: event.timestamp,
            },
            event.sessionId,
          );
        } else {
          // Reactivate if agent was previously shutdown (re-used name)
          agentQueries
            .updateStatus()
            .run("active", now, agentId, event.sessionId);
          sseManager.broadcast(
            "agent_status",
            {
              agent: agentId,
              sessionId: event.sessionId,
              status: "active",
            },
            event.sessionId,
          );
        }

        // Queue agent name for correlation with incoming SessionStart
        // When a new session appears, it will be assigned this name
        if (name !== "subagent") {
          pendingAgentNames.push(name);

          // Retroactive update: if SubagentStart already arrived before this
          // PostToolUse, the agent was created with name = id (temporary).
          // Find recently-created agents whose name equals their id and rename them.
          retroactivelyNameAgent(name, event.timestamp);
        }

        // Queue for SubagentStop correlation
        if (!spawnedSubagentQueue.has(event.sessionId)) {
          spawnedSubagentQueue.set(event.sessionId, []);
        }
        spawnedSubagentQueue.get(event.sessionId)!.push(agentId);
      }
    } catch {
      // Failed to parse Task tool input
    }
  }

  // Track file changes
  if (event.filePath && event.category === "file_change") {
    const changeType = event.tool === "Write" ? "created" : "modified";
    fileChangeQueries
      .upsert()
      .run(
        event.filePath,
        event.sessionId,
        event.agentId,
        changeType,
        event.timestamp,
        event.timestamp,
      );
  } else if (
    event.filePath &&
    (FILE_READ_TOOLS as readonly string[]).includes(event.tool || "")
  ) {
    fileChangeQueries
      .upsert()
      .run(
        event.filePath,
        event.sessionId,
        event.agentId,
        "read",
        event.timestamp,
        event.timestamp,
      );
  }

  // Track task items from TaskCreate/TaskUpdate tools
  if (event.tool === "TaskCreate" && event.metadata) {
    const subject =
      (event.metadata["subject"] as string) ||
      ((event.metadata["tool_input"] as Record<string, unknown>)?.[
        "subject"
      ] as string) ||
      "Untitled Task";
    const taskId = randomUUID();
    taskItemQueries
      .upsert()
      .run(
        taskId,
        event.sessionId,
        subject,
        "pending",
        null,
        event.timestamp,
        event.timestamp,
      );
  }

  if (event.tool === "TaskUpdate" && event.metadata) {
    const input = (event.metadata["tool_input"] ?? event.metadata) as Record<
      string,
      unknown
    >;
    const taskId = (input["taskId"] as string) || "";
    const status = input["status"] as string | undefined;
    const owner = input["owner"] as string | undefined;
    if (taskId) {
      taskItemQueries
        .upsert()
        .run(
          taskId,
          event.sessionId,
          input["subject"] || "Updated Task",
          status || "pending",
          owner || null,
          event.timestamp,
          event.timestamp,
        );
    }

    // === TaskCompleted Detection (GOLD correlation path) ===
    // When Claude's TaskUpdate marks a task as completed, try to match
    // the subject against PRD tasks for direct auto-completion.
    if (status === "completed") {
      try {
        handleTaskCompleted(event, input);
      } catch {
        // TaskCompleted correlation errors must not break event processing
      }
    }
  }

  // Enrich SendMessage metadata with parsed recipient/content
  if (event.tool === "SendMessage" && event.metadata) {
    try {
      const input = (event.metadata["tool_input"] ?? event.metadata) as Record<
        string,
        unknown
      >;
      const recipient = input["recipient"] ?? input["target_agent_id"];
      const content = input["content"] ?? input["message"];
      const msgType = input["type"];
      if (typeof recipient === "string") {
        event.metadata["_parsed_recipient"] = recipient;
      }
      if (typeof content === "string") {
        event.metadata["_parsed_content"] = content.slice(0, 100);
      }
      if (typeof msgType === "string") {
        event.metadata["_parsed_msg_type"] = msgType;
      }
    } catch {
      // skip
    }
  }

  // Detect TeamCreate
  if (event.tool === "TeamCreate" && event.metadata) {
    try {
      const input = (event.metadata["tool_input"] ?? event.metadata) as Record<
        string,
        unknown
      >;
      const teamName = input["team_name"] ?? input["teamName"];
      if (typeof teamName === "string") {
        sseManager.broadcast(
          "team_created",
          {
            teamName,
            createdBy: event.agentId,
            sessionId: event.sessionId,
            timestamp: event.timestamp,
          },
          event.sessionId,
        );
      }
    } catch {
      // skip
    }
  }

  // Persist the event
  eventQueries
    .insert()
    .run(
      event.id,
      event.sessionId,
      event.agentId,
      event.timestamp,
      event.hookType,
      event.category,
      event.tool || null,
      event.filePath || null,
      event.input || null,
      event.output || null,
      event.error || null,
      event.duration || null,
      event.metadata ? JSON.stringify(event.metadata) : null,
    );
}

// ---------------------------------------------------------------------------
// TaskCompleted Detection - GOLD correlation path
// ---------------------------------------------------------------------------

/**
 * When Claude Code's TaskUpdate tool marks a task as "completed", we extract
 * the subject and try to match it directly against PRD task titles.
 * This is the highest-confidence correlation path (confidence 1.0) because
 * the agent explicitly declared the task as done.
 */
function handleTaskCompleted(
  event: AgentEvent,
  input: Record<string, unknown>,
): void {
  const subject = (input["subject"] as string) || "";
  if (!subject || subject === "Updated Task") return;

  // Get the project for this session
  const projectId = getProjectForSession(event.sessionId);
  if (!projectId) return;

  // Normalize subject for matching: lowercase, strip common prefixes
  const normalizedSubject = subject
    .toLowerCase()
    .replace(/^\[cam:[^\]]*\]\s*/, "")
    .trim();

  if (normalizedSubject.length < 5) return;

  // Strategy 1: Exact LIKE match (most reliable)
  const likePattern = `%${normalizedSubject.slice(0, 60)}%`;
  const exactMatches = prdTaskQueries
    .findByTitle()
    .all(projectId, likePattern) as Array<Record<string, unknown>>;

  // Filter to completable tasks (not already completed, deferred, or backlog)
  const completable = exactMatches.filter((t) => {
    const taskStatus = t["status"] as string;
    return (
      taskStatus !== "completed" &&
      taskStatus !== "deferred" &&
      taskStatus !== "backlog"
    );
  });

  if (completable.length === 1) {
    // Single match = high confidence, auto-complete
    const task = completable[0]!;
    const taskId = task["id"] as string;
    const taskTitle = task["title"] as string;
    const reason = `TaskCompleted GOLD path: agent ${event.agentId} marked "${subject}" as completed (matched PRD task "${taskTitle}")`;

    markPrdTaskCompleted(taskId, reason);

    // Create high-confidence binding for audit trail
    agentTaskBindingQueries
      .bind()
      .run(
        randomUUID(),
        event.agentId,
        event.sessionId,
        taskId,
        1.0,
        event.timestamp,
      );

    // Broadcast task completion
    sseManager.broadcast("task_completed", {
      taskId,
      taskTitle,
      agentId: event.agentId,
      sessionId: event.sessionId,
      source: "gold_path",
      confidence: 1.0,
    });

    console.log(
      `[task-completed] GOLD: "${subject}" -> PRD task "${taskTitle}" (${taskId})`,
    );
    return;
  }

  // Strategy 2: If multiple matches, try exact title match
  if (completable.length > 1) {
    const exactTitleMatch = completable.find(
      (t) => (t["title"] as string).toLowerCase() === normalizedSubject,
    );
    if (exactTitleMatch) {
      const taskId = exactTitleMatch["id"] as string;
      const taskTitle = exactTitleMatch["title"] as string;
      const reason = `TaskCompleted GOLD path (exact title): agent ${event.agentId} completed "${subject}"`;

      markPrdTaskCompleted(taskId, reason);

      agentTaskBindingQueries
        .bind()
        .run(
          randomUUID(),
          event.agentId,
          event.sessionId,
          taskId,
          1.0,
          event.timestamp,
        );

      sseManager.broadcast("task_completed", {
        taskId,
        taskTitle,
        agentId: event.agentId,
        sessionId: event.sessionId,
        source: "gold_path_exact",
        confidence: 1.0,
      });

      console.log(
        `[task-completed] GOLD (exact): "${subject}" -> PRD task "${taskTitle}" (${taskId})`,
      );
    }
  }
}

/**
 * Cleanup stale sessions: mark active sessions with no recent activity as completed.
 * Uses the last event timestamp as ended_at (not "now"), so the session
 * end time accurately reflects when work actually stopped.
 * Should be called periodically (every 5 minutes via STALE_SESSION_CLEANUP_INTERVAL_MS).
 */
export function cleanupStaleSessions(): void {
  try {
    const now = new Date().toISOString();
    const cutoff = new Date(
      Date.now() - STALE_SESSION_TIMEOUT_MS,
    ).toISOString();
    const staleSessions = sessionQueries
      .getActiveStaleSessions()
      .all(cutoff, cutoff) as Array<Record<string, unknown>>;

    for (const session of staleSessions) {
      const sessionId = session["id"] as string;
      // Use the last event timestamp as ended_at, falling back to "now"
      const lastEventAt = (session["last_event_at"] as string) || now;
      sessionQueries.updateStatus().run("completed", lastEventAt, sessionId);

      // Also mark all active agents in this session as completed
      const agents = agentQueries.getBySession().all(sessionId) as Array<
        Record<string, unknown>
      >;
      for (const agent of agents) {
        if (agent["status"] === "active" || agent["status"] === "idle") {
          const agentId = agent["id"] as string;
          agentQueries
            .updateStatus()
            .run("completed", lastEventAt, agentId, sessionId);
        }
      }

      sseManager.broadcast(
        "session_status",
        {
          session: sessionId,
          status: "completed",
          reason: "stale_timeout",
          endedAt: lastEventAt,
        },
        sessionId,
      );
    }

    if (staleSessions.length > 0) {
      console.log(
        `[cleanup] Marked ${staleSessions.length} stale session(s) as completed`,
      );
    }
  } catch {
    // DB not ready or query error, skip silently
  }
}

// ---------------------------------------------------------------------------
// Retroactive Agent Naming (Task 1: SubagentStart vs PostToolUse race)
// ---------------------------------------------------------------------------

/**
 * When PostToolUse for the Task tool arrives with a real agent name,
 * check if there are recently-created agents whose name equals their ID
 * (meaning SubagentStart arrived first and the agent was given a temporary name).
 * If found, update the agent's name retroactively.
 */
function retroactivelyNameAgent(realName: string, eventTimestamp: string): void {
  try {
    const cutoff = new Date(
      new Date(eventTimestamp).getTime() - RETROACTIVE_NAME_WINDOW_MS,
    ).toISOString();

    const unnamedAgents = agentQueries
      .getRecentUnnamed()
      .all(cutoff) as Array<Record<string, unknown>>;

    if (unnamedAgents.length === 0) return;

    // Pick the most recently created unnamed agent (first in DESC order)
    const agent = unnamedAgents[0]!;
    const agentId = agent["id"] as string;
    const sessionId = agent["session_id"] as string;

    // Update the agent name
    agentQueries.updateAgentName().run(realName, agentId, sessionId);

    // Also consume the pending name we just pushed (avoid double-assignment)
    const idx = pendingAgentNames.indexOf(realName);
    if (idx !== -1) {
      pendingAgentNames.splice(idx, 1);
    }

    // Broadcast the name update so the dashboard reflects it
    sseManager.broadcast(
      "agent_renamed",
      {
        agent: agentId,
        sessionId,
        oldName: agentId,
        newName: realName,
      },
      sessionId,
    );

    // Cross-broadcast to project peers
    const projectId = getProjectForSession(sessionId);
    if (projectId) {
      broadcastToProjectExcluding(
        projectId,
        "agent_renamed",
        {
          agent: agentId,
          sessionId,
          oldName: agentId,
          newName: realName,
        },
        sessionId,
      );
    }

    console.log(
      `[agent-naming] Retroactively renamed agent ${agentId} (session: ${sessionId}) to "${realName}"`,
    );
  } catch {
    // Naming errors should not break event processing
  }
}
