export const DEFAULT_SERVER_PORT = 7890;
export const DEFAULT_DASHBOARD_PORT = 7891;
export const DEFAULT_HOST = "localhost";
export const DEFAULT_BIND_HOST = "0.0.0.0";

export const SSE_HEARTBEAT_INTERVAL_MS = 15_000;
export const AGENT_IDLE_TIMEOUT_MS = 30_000;

export const MAX_INPUT_LENGTH = 50000;
export const MAX_OUTPUT_LENGTH = 50000;

export const DEFAULT_EVENT_LIMIT = 100;
export const DEFAULT_SESSION_LIMIT = 10;

export const HOOK_TYPES = [
  "PreToolUse",
  "PostToolUse",
  "Notification",
  "Stop",
  "SubagentStop",
  "PreCompact",
  "PostCompact",
  "PreToolUseRejected",
  "ToolError",
  "SessionStart",
] as const;

export const EVENT_CATEGORIES = [
  "tool_call",
  "file_change",
  "command",
  "message",
  "lifecycle",
  "error",
  "compact",
  "notification",
] as const;

export const FILE_CHANGE_TOOLS = ["Edit", "Write", "NotebookEdit"] as const;
export const FILE_READ_TOOLS = ["Read", "Glob", "Grep"] as const;
export const COMMAND_TOOLS = ["Bash"] as const;
export const MESSAGE_TOOLS = ["SendMessage"] as const;
export const TASK_TOOLS = [
  "TaskCreate",
  "TaskUpdate",
  "TaskList",
  "TaskGet",
] as const;
