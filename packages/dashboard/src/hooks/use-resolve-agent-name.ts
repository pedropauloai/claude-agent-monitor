import { useMemo, useCallback } from "react";
import { useSessionStore } from "../stores/session-store.js";
import { getAgentDisplayName } from "../lib/friendly-names.js";

/**
 * Hook that resolves agent UUIDs to human-readable display names.
 *
 * Uses the agents array from the session store to look up the agent by ID.
 * The first agent (earliest first_seen_at) with no meaningful name defaults to "main".
 * Falls back to the agent type, then first 8 characters of the UUID.
 *
 * @returns A function `resolveAgentName(agentId: string) => string`
 */
export function useResolveAgentName(): (agentId: string) => string {
  const agents = useSessionStore((s) => s.agents);

  const agentNameMap = useMemo(() => {
    const map = new Map<string, string>();

    // Determine the earliest agent (main/leader) by first_seen_at
    let earliestAgent: { id: string; firstSeenAt: string } | null = null;
    for (const agent of agents) {
      if (
        !earliestAgent ||
        agent.firstSeenAt < earliestAgent.firstSeenAt
      ) {
        earliestAgent = { id: agent.id, firstSeenAt: agent.firstSeenAt };
      }
    }

    for (const agent of agents) {
      const agentType = agent.type ?? undefined;
      let displayName = getAgentDisplayName(agent.id, agent.name, agentType);

      // If the display name is still just the first 8 chars of the ID
      // and this is the earliest agent, show "main"
      if (
        displayName === agent.id.slice(0, 8) &&
        earliestAgent &&
        agent.id === earliestAgent.id
      ) {
        displayName = "main";
      }

      map.set(agent.id, displayName);
    }
    return map;
  }, [agents]);

  const resolveAgentName = useCallback(
    (agentId: string): string => {
      const found = agentNameMap.get(agentId);
      if (found) return found;

      // If not found in the current session's agents, check if it looks
      // like a meaningful name (not a UUID) and return it directly
      if (!isLikelyId(agentId)) {
        return agentId;
      }

      // Fallback: first 8 chars of UUID
      return agentId.slice(0, 8);
    },
    [agentNameMap],
  );

  return resolveAgentName;
}

/**
 * Check if a string looks like an auto-generated ID (UUID or hex hash).
 */
function isLikelyId(value: string): boolean {
  const trimmed = value.trim();
  // UUID pattern
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return true;
  }
  // Hex hash (8+ hex chars)
  if (/^[0-9a-f]{8,}$/i.test(trimmed)) {
    return true;
  }
  return false;
}
