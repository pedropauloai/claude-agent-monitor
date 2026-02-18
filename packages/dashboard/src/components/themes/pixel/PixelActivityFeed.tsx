import { useRef, useEffect, useState, useMemo } from "react";
import { useSessionStore } from "../../../stores/session-store";
import { useFilterStore } from "../../../stores/filter-store";
import { useSettingsStore } from "../../../stores/settings-store";
import { useEvents } from "../../../hooks/use-events";
import { formatTimestamp } from "../../../lib/formatters";
import {
  getAgentDisplayName,
  extractFilename,
} from "../../../lib/friendly-names.js";
import { formatToolName, formatEventInput, formatEventOutput } from "../../../lib/event-formatters.js";
import type { AgentEvent } from "@cam/shared";

const POLLING_TOOLS = new Set(["TaskList", "TaskGet"]);

interface GroupedEvent {
  event: AgentEvent;
  count: number;
  groupId: string;
}

function groupConsecutiveEvents(events: AgentEvent[]): GroupedEvent[] {
  const result: GroupedEvent[] = [];
  let i = 0;
  while (i < events.length) {
    const current = events[i];
    if (current.tool && POLLING_TOOLS.has(current.tool)) {
      let count = 1;
      while (
        i + count < events.length &&
        events[i + count].tool === current.tool &&
        events[i + count].agentId === current.agentId
      ) {
        count++;
      }
      result.push({ event: current, count, groupId: `grp-${current.id}` });
      i += count;
    } else {
      result.push({ event: current, count: 1, groupId: current.id });
      i++;
    }
  }
  return result;
}

/** RPG-style action descriptions for tools */
const TOOL_ACTIONS: Record<string, string> = {
  Edit: "used ENCHANT!",
  Write: "cast CREATE!",
  Read: "used SCAN!",
  Bash: "cast INVOKE!",
  Grep: "used SEARCH!",
  Glob: "used DETECT!",
  TaskCreate: "used QUEST LOG!",
  TaskUpdate: "used QUEST UPDATE!",
  TaskList: "checked QUEST BOARD!",
  SendMessage: "cast TELEPATHY!",
  WebFetch: "used SCRY!",
  WebSearch: "cast DIVINATION!",
  NotebookEdit: "used TOME EDIT!",
};

/** Effectiveness text based on tool outcome */
function getEffectiveness(event: AgentEvent): { text: string; color: string } {
  if (event.error) {
    return { text: "IT MISSED!", color: "var(--pixel-error)" };
  }
  if (event.duration && event.duration > 5000) {
    return { text: "IT WAS SLOW...", color: "var(--pixel-orange)" };
  }
  if (event.category === "error") {
    return { text: "CRITICAL MISS!", color: "var(--pixel-error)" };
  }
  if (event.category === "file_change") {
    return { text: "IT'S SUPER EFFECTIVE!", color: "var(--pixel-green)" };
  }
  return { text: "HIT!", color: "var(--pixel-cyan)" };
}

function getCategoryIcon(category: string): string {
  switch (category) {
    case "tool_call":
      return "\u2694";
    case "file_change":
      return "\u{1F4E6}";
    case "command":
      return "\u{1F4BB}";
    case "message":
      return "\u{1F4AC}";
    case "lifecycle":
      return "\u{1F504}";
    case "error":
      return "\u2620";
    case "compact":
      return "\u{1F4E6}";
    case "notification":
      return "\u{1F514}";
    default:
      return "\u25CF";
  }
}

export function PixelActivityFeed() {
  const events = useEvents();
  const agents = useSessionStore((s) => s.agents);
  const { searchQuery, setSearchQuery } = useFilterStore();
  const followMode = useSettingsStore((s) => s.followMode);
  const hidePolling = useSettingsStore((s) => s.hidePolling);
  const toggleFollowMode = useSettingsStore((s) => s.toggleFollowMode);
  const toggleHidePolling = useSettingsStore((s) => s.toggleHidePolling);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const agentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const agent of agents) {
      map.set(agent.id, getAgentDisplayName(agent.id, agent.name || agent.id, agent.type ?? undefined));
    }
    return map;
  }, [agents]);

  useEffect(() => {
    if (followMode && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events.length, followMode]);

  const filteredEvents = useMemo(() => {
    let filtered = events;
    if (hidePolling) {
      filtered = filtered.filter((e) => !e.tool || !POLLING_TOOLS.has(e.tool));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.tool?.toLowerCase().includes(q) ||
          e.filePath?.toLowerCase().includes(q) ||
          e.input?.toLowerCase().includes(q) ||
          e.output?.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [events, hidePolling, searchQuery]);

  const groupedEvents = useMemo(
    () => groupConsecutiveEvents(filteredEvents),
    [filteredEvents],
  );

  return (
    <div
      className="h-full flex flex-col"
      style={{ background: "var(--pixel-bg)" }}
    >
      {/* Feed Header */}
      <div
        className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{
          borderBottom: "3px solid var(--pixel-border)",
          background: "var(--pixel-surface)",
        }}
      >
        <span className="pixel-text-sm" style={{ color: "var(--pixel-gold)" }}>
          \u2694 BATTLE LOG ({filteredEvents.length})
        </span>

        <div className="flex items-center gap-2">
          {/* Search */}
          <input
            type="text"
            placeholder="SEARCH..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pixel-text-xs px-2 py-1"
            style={{
              width: "100px",
              background: "var(--pixel-bg-dark)",
              border: "2px solid var(--pixel-border)",
              color: "var(--pixel-text)",
              outline: "none",
              fontFamily: "'Press Start 2P', monospace",
            }}
          />

          {/* Hide Polling */}
          <button
            onClick={toggleHidePolling}
            className={`pixel-text-xs px-2 py-1 ${hidePolling ? "pixel-btn-active" : "pixel-btn"}`}
            title="Hide TaskList/TaskGet polling"
          >
            {hidePolling ? "POLL:OFF" : "POLL"}
          </button>

          {/* Follow Mode */}
          <button
            onClick={toggleFollowMode}
            className={`pixel-text-xs px-2 py-1 ${followMode ? "pixel-btn-active" : "pixel-btn"}`}
          >
            {followMode ? "AUTO" : "MANUAL"}
          </button>
        </div>
      </div>

      {/* Event List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pixel-scrollbar">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="pixel-text-2xl mb-3">\u2694</div>
            <p
              className="pixel-text-sm"
              style={{ color: "var(--pixel-text-muted)" }}
            >
              NO ENCOUNTERS YET
            </p>
            <p
              className="pixel-text-xs mt-2 pixel-blink"
              style={{ color: "var(--pixel-gold)" }}
            >
              AWAITING BATTLE...
            </p>
          </div>
        ) : (
          <div>
            {groupedEvents.map(({ event, count, groupId }, index) => (
              <div
                key={groupId}
                className="pixel-slide-in"
                style={{ animationDelay: `${Math.min(index * 0.02, 0.2)}s` }}
              >
                <EventItem
                  event={event}
                  agentNameMap={agentNameMap}
                  isExpanded={expandedId === event.id}
                  groupCount={count}
                  onToggle={() =>
                    setExpandedId(expandedId === event.id ? null : event.id)
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EventItem({
  event,
  agentNameMap,
  isExpanded,
  groupCount,
  onToggle,
}: {
  event: AgentEvent;
  agentNameMap: Map<string, string>;
  isExpanded: boolean;
  groupCount?: number;
  onToggle: () => void;
}) {
  const [showRawJson, setShowRawJson] = useState(false);
  const icon = getCategoryIcon(event.category);
  // For MCP tools, use formatted name in the action text
  const formattedTool = formatToolName(event.tool || event.hookType);
  const action =
    TOOL_ACTIONS[event.tool || ""] ||
    `used ${formattedTool.toUpperCase()}!`;
  const effectiveness = getEffectiveness(event);

  return (
    <div
      className="px-4 py-2 cursor-pointer"
      onClick={onToggle}
      style={{
        borderBottom: "1px solid var(--pixel-border)",
        background: isExpanded ? "var(--pixel-surface)" : "transparent",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background =
          "var(--pixel-surface)";
      }}
      onMouseLeave={(e) => {
        if (!isExpanded)
          (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <span className="pixel-text-base mt-0.5 w-5 text-center shrink-0">
          {icon}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Battle action line */}
          <div className="flex items-center gap-1 flex-wrap">
            <span
              className="pixel-text-xs"
              style={{ color: "var(--pixel-cyan)" }}
              title={event.agentId}
            >
              {agentNameMap.get(event.agentId) ?? event.agentId.slice(0, 8)}
            </span>
            <span
              className="pixel-text-xs"
              style={{ color: "var(--pixel-text)" }}
              title={event.tool || event.hookType}
            >
              {action}
            </span>
            {groupCount && groupCount > 1 && (
              <span
                className="pixel-text-xs"
                style={{
                  color: "var(--pixel-gold)",
                  background: "var(--pixel-bg-dark)",
                  border: "1px solid var(--pixel-border)",
                  padding: "0 3px",
                }}
              >
                x{groupCount}
              </span>
            )}
          </div>

          {/* Effectiveness */}
          <span
            className="pixel-text-xs"
            style={{ color: effectiveness.color }}
          >
            {effectiveness.text}
          </span>

          {/* File path as target */}
          {event.filePath && (
            <div className="mt-0.5">
              <span
                className="pixel-text-xs"
                style={{ color: "var(--pixel-text-dim)" }}
                title={event.filePath}
              >
                TARGET: {extractFilename(event.filePath)}
              </span>
            </div>
          )}

          {/* Error display */}
          {event.error && (
            <p
              className="pixel-text-xs mt-0.5 pixel-shake"
              style={{ color: "var(--pixel-error)" }}
            >
              \u2620 {event.error}
            </p>
          )}

          {/* Expanded Content */}
          {isExpanded && (
            <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
              {event.input && (
                <div>
                  <span
                    className="pixel-text-xs"
                    style={{ color: "var(--pixel-gold)" }}
                  >
                    INPUT:
                  </span>
                  <pre
                    className="mt-1 pixel-text-xs overflow-x-auto max-h-32 pixel-scrollbar whitespace-pre-wrap break-all p-2"
                    style={{
                      color: "var(--pixel-text-muted)",
                      background: "var(--pixel-bg-dark)",
                      border: "2px solid var(--pixel-border)",
                      fontFamily: "'Press Start 2P', monospace",
                    }}
                  >
                    {showRawJson ? event.input : formatEventInput(event.tool, event.input)}
                  </pre>
                </div>
              )}
              {event.output && (
                <div>
                  <span
                    className="pixel-text-xs"
                    style={{ color: "var(--pixel-gold)" }}
                  >
                    OUTPUT:
                  </span>
                  <pre
                    className="mt-1 pixel-text-xs overflow-x-auto max-h-32 pixel-scrollbar whitespace-pre-wrap break-all p-2"
                    style={{
                      color: "var(--pixel-text-muted)",
                      background: "var(--pixel-bg-dark)",
                      border: "2px solid var(--pixel-border)",
                      fontFamily: "'Press Start 2P', monospace",
                    }}
                  >
                    {showRawJson ? event.output : formatEventOutput(event.output)}
                  </pre>
                </div>
              )}
              <div className="flex items-center gap-2">
                {event.duration !== undefined && (
                  <span
                    className="pixel-text-xs"
                    style={{ color: "var(--pixel-text-dim)" }}
                  >
                    CAST TIME: {event.duration}ms
                  </span>
                )}
                {(event.input || event.output) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowRawJson(!showRawJson);
                    }}
                    className="pixel-text-xs pixel-btn"
                    style={{ padding: "0 4px", fontSize: "7px" }}
                  >
                    {showRawJson ? "SUMMARY" : "RAW"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span
          className="pixel-text-xs shrink-0"
          style={{ color: "var(--pixel-text-dim)" }}
        >
          {formatTimestamp(event.timestamp)}
        </span>
      </div>
    </div>
  );
}
