import { useState, useMemo } from "react";
import { useSessionStore } from "../../../stores/session-store";
import { useAgents } from "../../../hooks/use-agents";
import {
  formatRelativeTime,
  getStatusDotColor,
  generateIdenticon,
} from "../../../lib/formatters";
import { getAgentDisplayName } from "../../../lib/friendly-names.js";
import type { Agent } from "@cam/shared";

/** Agents with status 'active' are considered active; all others are inactive */
function isActiveAgent(agent: Agent): boolean {
  return agent.status === 'active';
}

export function ModernAgentPanel() {
  const agents = useAgents();
  const { selectedAgentId, selectAgent } = useSessionStore();
  const [showInactive, setShowInactive] = useState(false);

  const { activeAgents, inactiveAgents } = useMemo(() => {
    const active: Agent[] = [];
    const inactive: Agent[] = [];
    for (const agent of agents) {
      if (isActiveAgent(agent)) {
        active.push(agent);
      } else {
        inactive.push(agent);
      }
    }
    return { activeAgents: active, inactiveAgents: inactive };
  }, [agents]);

  if (agents.length === 0) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full text-center">
        <div className="w-10 h-10 rounded-full bg-cam-surface-2 border border-cam-border flex items-center justify-center mb-3">
          <svg
            className="w-5 h-5 text-cam-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <p className="text-xs text-cam-text-muted">Waiting for agents...</p>
        <p className="text-[10px] text-cam-text-muted mt-1">
          Agents will appear when Claude Code starts
        </p>
      </div>
    );
  }

  return (
    <div className="p-2">
      {/* Active Agents */}
      <div className="px-2 py-1.5 mb-1">
        <span className="text-[10px] uppercase tracking-wider text-cam-text-muted font-medium">
          Active ({activeAgents.length})
        </span>
      </div>

      {activeAgents.length > 0 ? (
        <div className="space-y-0.5">
          {activeAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isSelected={selectedAgentId === agent.id}
              onSelect={() =>
                selectAgent(selectedAgentId === agent.id ? null : agent.id)
              }
            />
          ))}
        </div>
      ) : (
        <div className="px-2 py-3 text-center">
          <p className="text-[10px] text-cam-text-muted">No active agents</p>
        </div>
      )}

      {/* Inactive Agents - Collapsible */}
      {inactiveAgents.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-cam-surface-2 transition-colors group"
          >
            <span className="text-[10px] uppercase tracking-wider text-cam-text-muted font-medium">
              Inactive
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] bg-cam-surface-2 text-cam-text-muted px-1.5 py-0.5 rounded-full font-medium">
                {inactiveAgents.length}
              </span>
              <svg
                className={`w-3 h-3 text-cam-text-muted transition-transform duration-200 ${showInactive ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {showInactive && (
            <div className="space-y-0.5 mt-1">
              {inactiveAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  isSelected={selectedAgentId === agent.id}
                  onSelect={() =>
                    selectAgent(selectedAgentId === agent.id ? null : agent.id)
                  }
                  compact
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AgentCard({
  agent,
  isSelected,
  onSelect,
  compact = false,
}: {
  agent: Agent;
  isSelected: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  const displayName = getAgentDisplayName(agent.id, agent.name);
  const identiconColor = generateIdenticon(agent.name);

  if (compact) {
    // Compact view for inactive agents: single line, smaller
    return (
      <button
        onClick={onSelect}
        title={`${agent.name} (${agent.id})`}
        className={`
          w-full text-left rounded-md px-2 py-1.5 transition-all duration-150
          ${
            isSelected
              ? "bg-cam-accent/10 border border-cam-accent/30"
              : "hover:bg-cam-surface-2 border border-transparent"
          }
        `}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusDotColor(agent.status)}`}
          />
          <span className="text-[11px] text-cam-text-muted truncate">
            {displayName}
          </span>
          <span className="text-[9px] px-1 py-0.5 rounded bg-cam-surface-3 text-cam-text-muted shrink-0">
            {agent.type}
          </span>
          <span className="text-[9px] text-cam-text-muted shrink-0">
            {agent.toolCallCount}c
          </span>
          <span className="text-[9px] text-cam-text-muted shrink-0">
            {formatRelativeTime(agent.lastActivityAt)}
          </span>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onSelect}
      title={`${agent.name} (${agent.id})`}
      className={`
        w-full text-left rounded-lg p-2.5 transition-all duration-150
        ${
          isSelected
            ? "bg-cam-accent/10 border border-cam-accent/30"
            : "hover:bg-cam-surface-2 border border-transparent"
        }
      `}
    >
      <div className="flex items-center gap-2.5">
        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{
            backgroundColor: `${identiconColor}20`,
            color: identiconColor,
          }}
        >
          {displayName.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusDotColor(agent.status)} ${agent.status === "active" ? "animate-pulse-dot" : ""}`}
            />
            <span className="text-xs font-medium text-cam-text truncate">
              {displayName}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cam-surface-3 text-cam-text-muted shrink-0">
              {agent.type}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-cam-text-muted">
              {agent.toolCallCount} calls
            </span>
            {agent.errorCount > 0 && (
              <span className="text-[10px] text-cam-error">
                {agent.errorCount} err
              </span>
            )}
          </div>
        </div>

        <span className="text-[10px] text-cam-text-muted shrink-0">
          {formatRelativeTime(agent.lastActivityAt)}
        </span>
      </div>
    </button>
  );
}
