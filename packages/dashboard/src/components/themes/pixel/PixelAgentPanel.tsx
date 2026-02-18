import { useState, useMemo } from "react";
import { useSessionStore } from "../../../stores/session-store";
import { useAgents } from "../../../hooks/use-agents";
import { formatRelativeTime, generateIdenticon } from "../../../lib/formatters";
import { getAgentDisplayName } from "../../../lib/friendly-names.js";
import type { Agent } from "@cam/shared";

const CLASS_NAMES: Record<string, string> = {
  "team-lead": "PALADIN",
  "code-writer": "MAGE",
  "code-reviewer": "CLERIC",
  tester: "RANGER",
  researcher: "SCHOLAR",
  designer: "BARD",
};

const CLASS_ICONS: Record<string, string> = {
  "team-lead": "\u2694",
  "code-writer": "\u{1F9D9}",
  "code-reviewer": "\u{1F6E1}",
  tester: "\u{1F3AF}",
  researcher: "\u{1F4DA}",
  designer: "\u{1F3A8}",
};

function getAgentClass(agent: Agent): string {
  const lower = agent.name.toLowerCase();
  for (const [key, value] of Object.entries(CLASS_NAMES)) {
    if (lower.includes(key)) return value;
  }
  if (agent.type === "lead") return "PALADIN";
  return "ADVENTURER";
}

function getAgentIcon(agent: Agent): string {
  const lower = agent.name.toLowerCase();
  for (const [key, value] of Object.entries(CLASS_ICONS)) {
    if (lower.includes(key)) return value;
  }
  return "\u2694";
}

function getStatusLabel(status: string): { text: string; color: string } {
  switch (status) {
    case "active":
      return { text: "FIGHTING", color: "var(--pixel-green)" };
    case "idle":
      return { text: "RESTING", color: "var(--pixel-orange)" };
    case "error":
      return { text: "POISONED", color: "var(--pixel-error)" };
    case "completed":
      return { text: "VICTORY", color: "var(--pixel-cyan)" };
    case "shutdown":
      return { text: "FALLEN", color: "var(--pixel-text-dim)" };
    default:
      return { text: status.toUpperCase(), color: "var(--pixel-text-muted)" };
  }
}

function isActiveAgent(agent: Agent): boolean {
  return agent.status === 'active';
}

export function PixelAgentPanel() {
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
        <div className="pixel-text-xl mb-3">\u2694</div>
        <p
          className="pixel-text-sm"
          style={{ color: "var(--pixel-text-muted)" }}
        >
          WAITING FOR
        </p>
        <p
          className="pixel-text-sm mt-1 pixel-blink"
          style={{ color: "var(--pixel-gold)" }}
        >
          PARTY MEMBERS...
        </p>
      </div>
    );
  }

  return (
    <div className="p-2">
      {/* Active Agents */}
      <div className="px-2 py-2 mb-2">
        <span className="pixel-text-xs" style={{ color: "var(--pixel-gold)" }}>
          ACTIVE PARTY ({activeAgents.length})
        </span>
      </div>

      {activeAgents.length > 0 ? (
        <div className="space-y-2">
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
          <p className="pixel-text-xs" style={{ color: "var(--pixel-text-muted)" }}>
            NO ACTIVE HEROES
          </p>
        </div>
      )}

      {/* Inactive Agents - Collapsible */}
      {inactiveAgents.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className="w-full text-left px-2 py-1.5 pixel-card"
            style={{ cursor: "pointer" }}
          >
            <div className="flex items-center justify-between">
              <span className="pixel-text-xs" style={{ color: "var(--pixel-text-dim)" }}>
                {showInactive ? "\u25BC" : "\u25B6"} FALLEN/RESTING
              </span>
              <span
                className="pixel-text-xs"
                style={{
                  color: "var(--pixel-gold)",
                  background: "var(--pixel-bg-dark)",
                  border: "1px solid var(--pixel-border)",
                  padding: "0 4px",
                }}
              >
                {inactiveAgents.length}
              </span>
            </div>
          </button>

          {showInactive && (
            <div className="space-y-1 mt-1">
              {inactiveAgents.map((agent) => (
                <CompactAgentCard
                  key={agent.id}
                  agent={agent}
                  isSelected={selectedAgentId === agent.id}
                  onSelect={() =>
                    selectAgent(selectedAgentId === agent.id ? null : agent.id)
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CompactAgentCard({
  agent,
  isSelected,
  onSelect,
}: {
  agent: Agent;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const displayName = getAgentDisplayName(agent.id, agent.name, agent.type ?? undefined);
  const status = getStatusLabel(agent.status);
  const icon = getAgentIcon(agent);

  return (
    <button
      onClick={onSelect}
      title={`${agent.name} (${agent.id})`}
      className={`w-full text-left px-2 py-1 ${isSelected ? "pixel-border-accent" : "pixel-card"}`}
      style={{ cursor: "pointer" }}
    >
      <div className="flex items-center gap-2">
        <span className="pixel-text-xs">{icon}</span>
        <span className="pixel-text-xs truncate" style={{ color: "var(--pixel-text-dim)" }}>
          {displayName}
        </span>
        <span className="pixel-text-xs shrink-0" style={{ color: "var(--pixel-gold, #d4a017)" }}>
          {agent.type}
        </span>
        <span className="pixel-text-xs" style={{ color: status.color }}>
          {status.text}
        </span>
        <span className="pixel-text-xs" style={{ color: "var(--pixel-text-dim)" }}>
          {formatRelativeTime(agent.lastActivityAt)}
        </span>
      </div>
    </button>
  );
}

function AgentCard({
  agent,
  isSelected,
  onSelect,
}: {
  agent: Agent;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const color = generateIdenticon(agent.name);
  const status = getStatusLabel(agent.status);
  const className = getAgentClass(agent);
  const icon = getAgentIcon(agent);

  // Simulate HP/MP based on agent stats
  const maxHp = 100;
  const hp =
    agent.errorCount > 0 ? Math.max(10, maxHp - agent.errorCount * 20) : maxHp;
  const mp = Math.min(100, agent.toolCallCount % 100);

  const displayName = getAgentDisplayName(agent.id, agent.name, agent.type ?? undefined);

  return (
    <button
      onClick={onSelect}
      title={`${agent.name} (${agent.id})`}
      className={`w-full text-left p-2 ${isSelected ? "pixel-border-accent" : "pixel-card"}`}
      style={{ cursor: "pointer" }}
    >
      {/* Name + Class */}
      <div className="flex items-center gap-2 mb-1">
        <span className="pixel-text-base">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="pixel-text-sm truncate" style={{ color: color }}>
              {displayName}
            </span>
            <span
              className="pixel-text-xs"
              style={{ color: "var(--pixel-gold, #d4a017)" }}
            >
              {agent.type}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="pixel-text-xs"
              style={{ color: "var(--pixel-text-dim)" }}
            >
              LV.{Math.min(99, Math.floor(agent.toolCallCount / 5) + 1)}
            </span>
            <span
              className="pixel-text-xs"
              style={{ color: "var(--pixel-text-dim)" }}
            >
              {className}
            </span>
          </div>
        </div>
      </div>

      {/* HP Bar */}
      <div className="flex items-center gap-1 mb-1">
        <span
          className="pixel-text-xs"
          style={{ color: "var(--pixel-hp)", width: "16px" }}
        >
          HP
        </span>
        <div className="flex-1 pixel-bar-container pixel-bar-hp">
          <div className="pixel-bar-fill" style={{ width: `${hp}%` }} />
        </div>
        <span
          className="pixel-text-xs"
          style={{
            color: "var(--pixel-text-muted)",
            width: "32px",
            textAlign: "right",
          }}
        >
          {hp}
        </span>
      </div>

      {/* MP Bar */}
      <div className="flex items-center gap-1 mb-1">
        <span
          className="pixel-text-xs"
          style={{ color: "var(--pixel-mp)", width: "16px" }}
        >
          MP
        </span>
        <div className="flex-1 pixel-bar-container pixel-bar-mp">
          <div className="pixel-bar-fill" style={{ width: `${mp}%` }} />
        </div>
        <span
          className="pixel-text-xs"
          style={{
            color: "var(--pixel-text-muted)",
            width: "32px",
            textAlign: "right",
          }}
        >
          {mp}
        </span>
      </div>

      {/* Status + Last Activity */}
      <div className="flex items-center justify-between">
        <span
          className={`pixel-text-xs ${agent.status === "active" ? "pixel-pulse" : ""}`}
          style={{ color: status.color }}
        >
          {status.text}
        </span>
        <span
          className="pixel-text-xs"
          style={{ color: "var(--pixel-text-dim)" }}
        >
          {formatRelativeTime(agent.lastActivityAt)}
        </span>
      </div>

      {/* Error indicator */}
      {agent.errorCount > 0 && (
        <div
          className="mt-1 pixel-text-xs pixel-shake"
          style={{ color: "var(--pixel-error)" }}
        >
          \u2620 {agent.errorCount} CURSE{agent.errorCount > 1 ? "S" : ""}
        </div>
      )}
    </button>
  );
}
