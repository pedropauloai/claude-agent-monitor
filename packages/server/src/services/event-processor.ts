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
const STALE_SESSION_TIMEOUT_MS = 10 * 60 * 1000;

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
    hookType === "SessionStart"
  )
    return "lifecycle";
  if (hookType === "ToolError" || hookType === "PreToolUseRejected")
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
    const toolInput = (src["tool_input"] ?? src) as Record<string, unknown>;
    if (typeof toolInput !== "object" || toolInput === null) continue;

    const path =
      toolInput["file_path"] ?? toolInput["path"] ?? toolInput["filePath"];
    if (typeof path === "string") return path;
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

  // Ensure agent exists
  const existingAgent = agentQueries
    .getById()
    .get(event.agentId, event.sessionId) as Record<string, unknown> | undefined;
  if (!existingAgent) {
    // Agent name resolution with 3 layers:
    // Layer 1: agent_type from SubagentStart metadata (most reliable)
    // Layer 2: agent_name from metadata
    // Layer 3: Fallback to agentId (dashboard generates friendly name)
    const agentType =
      (event.metadata?.["agent_type"] as string) || "general-purpose";
    const agentNameFromType =
      event.hookType === "SessionStart" && event.metadata?.["agent_type"]
        ? (event.metadata["agent_type"] as string)
        : undefined;
    const pendingName = pendingAgentNames.length > 0 ? pendingAgentNames.shift() : undefined;
    const agentName =
      agentNameFromType ||
      (event.metadata?.["agent_name"] as string) ||
      pendingName ||
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
        const name =
          (input["name"] as string) ||
          (input["description"] as string)?.slice(0, 30) ||
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

/**
 * Cleanup stale sessions: mark active sessions with no recent activity as completed.
 * Should be called periodically (e.g., every 60 seconds).
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
      sessionQueries.updateStatus().run("completed", now, sessionId);

      sseManager.broadcast(
        "session_status",
        {
          session: sessionId,
          status: "completed",
          reason: "stale_timeout",
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
