import { useState, useMemo } from "react";
import { useSessionStore } from "../../../stores/session-store";
import { useAgents } from "../../../hooks/use-agents";
import { formatRelativeTime } from "../../../lib/formatters";
import { getAgentDisplayName } from "../../../lib/friendly-names.js";
import type { Agent } from "@claudecam/shared";

const STATUS_CHARS: Record<string, string> = {
  active: "[*]",
  idle: "[-]",
  error: "[!]",
  completed: "[+]",
  shutdown: "[x]",
};

const STATUS_COLORS: Record<string, string> = {
  active: "text-[#00ff00]",
  idle: "text-[#ffaa00]",
  error: "text-[#ff3333]",
  completed: "text-[#00ccff]",
  shutdown: "text-[#006600]",
};

function isActiveAgent(agent: Agent): boolean {
  return agent.status === 'active';
}

export function TerminalAgentPanel() {
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
      <div className="p-3 font-mono text-[11px]">
        <div className="terminal-muted mb-2">{"## AGENTS ##"}</div>
        <div className="terminal-dim">
          <p>{"> Waiting for agents..."}</p>
          <p className="mt-1 terminal-cursor">{"> "}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 font-mono text-[11px]">
      {/* Active Agents */}
      <div className="terminal-muted mb-1 px-1">
        {"## ACTIVE (" + activeAgents.length + ") ##"}
      </div>
      <div className="border-t border-[#1a3a1a] mb-1" />

      {activeAgents.length > 0 ? (
        <div className="space-y-0.5">
          {activeAgents.map((agent) => (
            <AgentRow
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
        <div className="px-1 py-1 terminal-dim">
          {"> No active agents"}
        </div>
      )}

      {/* Inactive Agents - Collapsible */}
      {inactiveAgents.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className="w-full text-left px-1 py-0.5 hover:bg-[#0a1a0a] transition-colors"
          >
            <span className="terminal-dim">
              {showInactive ? "[-]" : "[+]"}{" "}
            </span>
            <span className="terminal-muted">
              {"INACTIVE (" + inactiveAgents.length + ")"}
            </span>
          </button>

          {showInactive && (
            <>
              <div className="border-t border-[#1a3a1a] mb-1 mt-1" />
              <div className="space-y-0.5">
                {inactiveAgents.map((agent) => (
                  <AgentRow
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
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AgentRow({
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
  const displayName = getAgentDisplayName(agent.id, agent.name, agent.type ?? undefined);
  const statusChar = STATUS_CHARS[agent.status] || "[ ]";
  const statusColor = STATUS_COLORS[agent.status] || "terminal-dim";

  if (compact) {
    // Compact single-line view for inactive agents
    return (
      <button
        onClick={onSelect}
        title={`${agent.name} (${agent.id})`}
        className={`
          w-full text-left px-1 py-0.5 font-mono text-[10px] transition-colors
          ${
            isSelected
              ? "bg-[#0a1f0a] border-l-2 border-[#00ff00]"
              : "hover:bg-[#0d1a0d] border-l-2 border-transparent"
          }
        `}
      >
        <div className="flex items-center gap-1">
          <span className={`${statusColor} shrink-0`}>{statusChar}</span>
          <span className="terminal-dim truncate">{displayName}</span>
          <span className="text-[#006600] shrink-0">[{agent.type}]</span>
          <span className="terminal-dim shrink-0">c:{agent.toolCallCount}</span>
          <span className="terminal-dim shrink-0">{formatRelativeTime(agent.lastActivityAt)}</span>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onSelect}
      title={`${agent.name} (${agent.id})`}
      className={`
        w-full text-left px-1 py-1 font-mono text-[11px] transition-colors
        ${
          isSelected
            ? "bg-[#0a1f0a] border-l-2 border-[#00ff00]"
            : "hover:bg-[#0d1a0d] border-l-2 border-transparent"
        }
      `}
    >
      <div className="flex items-center gap-1">
        <span
          className={`${statusColor} shrink-0 ${agent.status === "active" ? "terminal-glow" : ""}`}
        >
          {statusChar}
        </span>
        <span
          className={`truncate ${isSelected ? "text-[#00ff00] terminal-glow" : "text-[#00cc00]"}`}
        >
          {displayName}
        </span>
        <span className="text-[#006600] shrink-0">[{agent.type}]</span>
      </div>

      <div className="flex items-center gap-2 ml-4 mt-0.5">
        <span className="terminal-dim">calls:{agent.toolCallCount}</span>
        {agent.errorCount > 0 && (
          <span className="terminal-error">err:{agent.errorCount}</span>
        )}
        <span className="terminal-dim ml-auto">
          {formatRelativeTime(agent.lastActivityAt)}
        </span>
      </div>
    </button>
  );
}
