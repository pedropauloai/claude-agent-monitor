/**
 * Agent & Session Naming Utilities
 *
 * Simplified naming strategy (no Docker-style names):
 * 1. If agent name matches known "main" patterns -> "main"
 * 2. If agent name equals its ID (or first 8 chars) AND it's the earliest agent -> "main"
 * 3. If agent has a meaningful name (e.g., from Task tool) -> use it as-is
 * 4. If agent has a type that is descriptive -> use the type
 * 5. Last resort: first 8 chars of the ID
 */

/** Known names that indicate a "main" / lead agent */
const MAIN_AGENT_PATTERNS = new Set([
  "main",
  "team-lead",
  "team_lead",
  "teamlead",
  "lead",
  "orchestrator",
  "coordinator",
]);

/** Generic agent types that are not useful as display names */
const GENERIC_TYPES = new Set([
  "general-purpose",
  "general_purpose",
  "default",
  "agent",
  "unknown",
  "",
]);

/**
 * Get the display name for an agent.
 *
 * Priority:
 * 1. If name matches main/lead patterns -> "main"
 * 2. If the name is meaningful (not a UUID/hash) -> use it directly
 * 3. If name looks like an ID -> use agent type if available and descriptive
 * 4. Last resort -> first 8 chars of the ID
 */
export function getAgentDisplayName(
  agentId: string,
  agentName: string,
  agentType?: string,
): string {
  const lowerName = agentName.toLowerCase().trim();

  // Main agent detection by name
  if (MAIN_AGENT_PATTERNS.has(lowerName)) {
    return "main";
  }

  // If the name is meaningful (human-assigned, not a UUID/hash), use it
  if (isMeaningfulName(agentName)) {
    return agentName;
  }

  // Name looks like an ID - try using the agent type
  if (agentType && !GENERIC_TYPES.has(agentType.toLowerCase().trim())) {
    return agentType;
  }

  // Last resort: first 8 chars of the ID
  return agentId.slice(0, 8);
}

/**
 * Check if a name is "meaningful" (human-assigned) vs auto-generated (UUID/hash).
 * Also detects when name equals the ID (first 8 chars), which means no real name was set.
 */
function isMeaningfulName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length === 0) return false;

  // Very short single-char names are not meaningful
  if (trimmed.length <= 1) return false;

  // UUIDs: 8-4-4-4-12 hex chars (36 chars total)
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(trimmed)) return false;

  // Long hex strings are likely auto-generated IDs
  const hexPattern = /^[0-9a-f]{8,}$/i;
  if (hexPattern.test(trimmed)) return false;

  return true;
}

/**
 * Get a short version of a session ID for display as subtitle.
 * Returns first 8 characters.
 */
export function getShortSessionId(sessionId: string): string {
  return sessionId.slice(0, 8);
}

/**
 * Format a session for display.
 * Returns a friendly label like "Session #1" or a timestamp-based label.
 */
export function formatSessionLabel(
  sessionId: string,
  index: number,
  startedAt?: string,
): { label: string; subtitle: string; tooltip: string } {
  const subtitle = getShortSessionId(sessionId);

  if (startedAt) {
    const date = new Date(startedAt);
    const time = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const day = date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
    });

    return {
      label: `${time} - ${day}`,
      subtitle,
      tooltip: sessionId,
    };
  }

  return {
    label: `Session #${index + 1}`,
    subtitle,
    tooltip: sessionId,
  };
}

/**
 * Extract the filename from a file path.
 * E.g., "/src/components/App.tsx" -> "App.tsx"
 */
export function extractFilename(filePath: string): string {
  const parts = filePath.split("/");
  return parts[parts.length - 1] || filePath;
}

/**
 * Format a file path for display: filename as primary, full path as tooltip.
 */
export function formatFilePath(filePath: string): {
  display: string;
  tooltip: string;
} {
  return {
    display: extractFilename(filePath),
    tooltip: filePath,
  };
}
