import { useState } from "react";
import { useSessionStore } from "../../../stores/session-store";
import {
  formatTimestamp,
  formatRelativeTime,
  formatDuration,
  generateIdenticon,
  getCategoryColor,
} from "../../../lib/formatters";
import {
  getAgentDisplayName,
  extractFilename,
} from "../../../lib/friendly-names.js";

type TabId = "activity" | "files" | "errors" | "messages";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "activity", label: "LOG", icon: "\📜" },
  { id: "files", label: "LOOT", icon: "\📦" },
  { id: "errors", label: "CURSES", icon: "\u2620" },
  { id: "messages", label: "CHAT", icon: "\💬" },
];

export function PixelAgentDetail() {
  const { selectedAgentId, agents, events, selectAgent } = useSessionStore();
  const [activeTab, setActiveTab] = useState<TabId>("activity");

  const agent = agents.find((a) => a.id === selectedAgentId);
  if (!agent) return null;

  const agentEvents = events.filter((e) => e.agentId === agent.id);
  const agentErrors = agentEvents.filter(
    (e) => e.category === "error" || e.error,
  );
  const agentFiles = agentEvents
    .filter((e) => e.filePath)
    .reduce((acc, e) => {
      if (e.filePath && !acc.includes(e.filePath)) acc.push(e.filePath);
      return acc;
    }, [] as string[]);
  const agentMessages = agentEvents.filter((e) => e.category === "message");
  const color = generateIdenticon(agent.name);

  // RPG stats
  const level = Math.min(99, Math.floor(agent.toolCallCount / 5) + 1);
  const xpCurrent = agent.toolCallCount % 50;
  const xpMax = 50;
  const hp =
    agent.errorCount > 0 ? Math.max(10, 100 - agent.errorCount * 20) : 100;
  const mp = Math.min(100, agent.toolCallCount % 100);
  const str = Math.min(99, Math.floor(agent.toolCallCount / 3));
  const def = Math.min(99, 50 - Math.min(50, agent.errorCount * 10));
  const spd = Math.min(99, agentEvents.length > 0 ? 60 : 10);
  const lck = Math.min(99, agent.errorCount === 0 ? 80 : 20);

  return (
    <div
      className="h-full flex flex-col"
      style={{ background: "var(--pixel-bg)" }}
    >
      {/* Character Sheet Header */}
      <div
        className="p-3 shrink-0"
        style={{
          borderBottom: "3px solid var(--pixel-border)",
          background: "var(--pixel-surface)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 flex items-center justify-center pixel-border"
              style={{ background: `${color}20`, color }}
            >
              <span className="pixel-text-lg font-bold">
                {agent.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3
                className="pixel-text-sm"
                style={{ color: "var(--pixel-text)" }}
                title={`${agent.name} (${agent.id})`}
              >
                {getAgentDisplayName(agent.id, agent.name, agent.type ?? undefined)}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="pixel-text-xs"
                  style={{ color: "var(--pixel-gold)" }}
                >
                  LV.{level}
                </span>
                <span
                  className="pixel-text-xs"
                  style={{ color: "var(--pixel-text-dim)" }}
                >
                  {agent.type.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => selectAgent(null)}
            className="pixel-btn px-2 py-1 pixel-text-xs"
            style={{ color: "var(--pixel-text-muted)" }}
          >
            X
          </button>
        </div>

        {/* HP / MP / XP Bars */}
        <div className="space-y-1 mb-2">
          <div className="flex items-center gap-1">
            <span
              className="pixel-text-xs"
              style={{ color: "var(--pixel-hp)", width: "20px" }}
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
                width: "40px",
                textAlign: "right",
              }}
            >
              {hp}/100
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="pixel-text-xs"
              style={{ color: "var(--pixel-mp)", width: "20px" }}
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
                width: "40px",
                textAlign: "right",
              }}
            >
              {mp}/100
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="pixel-text-xs"
              style={{ color: "var(--pixel-xp)", width: "20px" }}
            >
              XP
            </span>
            <div className="flex-1 pixel-bar-container pixel-bar-xp">
              <div
                className="pixel-bar-fill"
                style={{ width: `${(xpCurrent / xpMax) * 100}%` }}
              />
            </div>
            <span
              className="pixel-text-xs"
              style={{
                color: "var(--pixel-text-muted)",
                width: "40px",
                textAlign: "right",
              }}
            >
              {xpCurrent}/{xpMax}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-1">
          {[
            { label: "STR", value: str, color: "var(--pixel-hp)" },
            { label: "DEF", value: def, color: "var(--pixel-blue)" },
            { label: "SPD", value: spd, color: "var(--pixel-green)" },
            { label: "LCK", value: lck, color: "var(--pixel-gold)" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="text-center p-1"
              style={{
                background: "var(--pixel-bg-dark)",
                border: "2px solid var(--pixel-border)",
              }}
            >
              <div
                className="pixel-text-sm font-bold"
                style={{ color: stat.color }}
              >
                {stat.value}
              </div>
              <div
                className="pixel-text-xs"
                style={{ color: "var(--pixel-text-dim)" }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex shrink-0"
        style={{ borderBottom: "3px solid var(--pixel-border)" }}
      >
        {TABS.map((tab) => {
          const count =
            tab.id === "activity"
              ? agentEvents.length
              : tab.id === "files"
                ? agentFiles.length
                : tab.id === "errors"
                  ? agentErrors.length
                  : agentMessages.length;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-2 pixel-text-xs text-center"
              style={{
                background:
                  activeTab === tab.id
                    ? "var(--pixel-accent)"
                    : "var(--pixel-surface)",
                color:
                  activeTab === tab.id ? "#fff" : "var(--pixel-text-muted)",
                borderRight: "2px solid var(--pixel-border)",
                cursor: "pointer",
              }}
            >
              {tab.icon} {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto pixel-scrollbar">
        {activeTab === "activity" && (
          <div>
            {agentEvents.length === 0 ? (
              <p
                className="pixel-text-xs p-4 text-center"
                style={{ color: "var(--pixel-text-muted)" }}
              >
                NO ADVENTURE LOG YET
              </p>
            ) : (
              agentEvents.slice(0, 100).map((event) => (
                <div
                  key={event.id}
                  className="px-3 py-2"
                  style={{ borderBottom: "1px solid var(--pixel-border)" }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="pixel-text-xs"
                      style={{ color: "var(--pixel-cyan)" }}
                    >
                      {event.tool || event.hookType}
                    </span>
                    <span
                      className="pixel-text-xs"
                      style={{ color: "var(--pixel-text-dim)" }}
                    >
                      {formatTimestamp(event.timestamp)}
                    </span>
                  </div>
                  {event.filePath && (
                    <span
                      className="pixel-text-xs block mt-0.5"
                      style={{ color: "var(--pixel-text-muted)" }}
                      title={event.filePath}
                    >
                      {extractFilename(event.filePath)}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "files" && (
          <div className="p-2 space-y-1">
            {agentFiles.length === 0 ? (
              <p
                className="pixel-text-xs p-4 text-center"
                style={{ color: "var(--pixel-text-muted)" }}
              >
                NO LOOT FOUND
              </p>
            ) : (
              agentFiles.map((filePath) => (
                <div
                  key={filePath}
                  className="flex items-center gap-2 px-2 py-1.5"
                  style={{ border: "1px solid var(--pixel-border)" }}
                >
                  <span className="pixel-text-xs">\📦</span>
                  <span
                    className="pixel-text-xs break-all"
                    style={{ color: "var(--pixel-text)" }}
                    title={filePath}
                  >
                    {extractFilename(filePath)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "errors" && (
          <div>
            {agentErrors.length === 0 ? (
              <p
                className="pixel-text-xs p-4 text-center"
                style={{ color: "var(--pixel-green)" }}
              >
                NO CURSES! ALL CLEAR!
              </p>
            ) : (
              agentErrors.map((event) => (
                <div
                  key={event.id}
                  className="px-3 py-2"
                  style={{ borderBottom: "1px solid var(--pixel-border)" }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="pixel-text-xs"
                      style={{ color: "var(--pixel-error)" }}
                    >
                      \u2620 {event.tool || event.hookType}
                    </span>
                    <span
                      className="pixel-text-xs"
                      style={{ color: "var(--pixel-text-dim)" }}
                    >
                      {formatTimestamp(event.timestamp)}
                    </span>
                  </div>
                  {event.error && (
                    <p
                      className="pixel-text-xs mt-0.5 break-all"
                      style={{ color: "var(--pixel-error)" }}
                    >
                      {event.error}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "messages" && (
          <div>
            {agentMessages.length === 0 ? (
              <p
                className="pixel-text-xs p-4 text-center"
                style={{ color: "var(--pixel-text-muted)" }}
              >
                NO TELEPATHY LOGS
              </p>
            ) : (
              agentMessages.map((event) => (
                <div
                  key={event.id}
                  className="px-3 py-2"
                  style={{ borderBottom: "1px solid var(--pixel-border)" }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="pixel-text-xs"
                      style={{ color: "var(--pixel-purple)" }}
                    >
                      \💬 TELEPATHY
                    </span>
                    <span
                      className="pixel-text-xs"
                      style={{ color: "var(--pixel-text-dim)" }}
                    >
                      {formatTimestamp(event.timestamp)}
                    </span>
                  </div>
                  {event.input && (
                    <p
                      className="pixel-text-xs mt-0.5 break-words whitespace-pre-wrap"
                      style={{ color: "var(--pixel-text-muted)" }}
                    >
                      {event.input}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
