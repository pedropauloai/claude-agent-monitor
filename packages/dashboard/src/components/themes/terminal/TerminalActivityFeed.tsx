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
import type { AgentEvent } from "@claudecam/shared";

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

const TOOL_SYMBOLS: Record<string, string> = {
  Edit: "EDT",
  Write: "WRT",
  Read: "RD ",
  Bash: "SH ",
  Grep: "GRP",
  Glob: "GLB",
  TaskCreate: "T+ ",
  TaskUpdate: "T~ ",
  TaskList: "TL ",
  SendMessage: "MSG",
  WebFetch: "GET",
  WebSearch: "WEB",
};

const CATEGORY_PREFIX: Record<string, string> = {
  tool_call: "TOOL",
  file_change: "FILE",
  command: "CMD ",
  message: "MSG ",
  lifecycle: "SYS ",
  error: "ERR ",
  compact: "CMP ",
  notification: "NTF ",
};

export function TerminalActivityFeed() {
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
    <div className="h-full flex flex-col font-mono text-[11px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1a3a1a] shrink-0">
        <span className="terminal-muted">
          {"## tail -f activity.log (" + filteredEvents.length + " lines) ##"}
        </span>
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <span className="terminal-dim mr-1">grep:</span>
            <input
              type="text"
              placeholder="..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-24 bg-[#0d0d0d] border border-[#1a3a1a] px-1.5 py-0.5 text-[11px] text-[#00ff00] font-mono placeholder:text-[#003300] focus:outline-none focus:border-[#00aa00]"
            />
          </div>
          <button
            onClick={toggleHidePolling}
            className={`px-2 py-0.5 font-mono text-[10px] border ${
              hidePolling
                ? "bg-[#1f1f0a] text-[#ffaa00] border-[#aa7700]"
                : "bg-[#0d0d0d] text-[#006600] border-[#1a3a1a]"
            }`}
            title="Hide TaskList/TaskGet polling"
          >
            {hidePolling ? "[P]oll:OFF" : "[P]oll"}
          </button>
          <button
            onClick={toggleFollowMode}
            className={`px-2 py-0.5 font-mono text-[10px] border ${
              followMode
                ? "bg-[#0a1f0a] text-[#00ff00] border-[#00aa00] terminal-glow"
                : "bg-[#0d0d0d] text-[#006600] border-[#1a3a1a]"
            }`}
          >
            {followMode ? "[F]ollow:ON" : "[F]ollow:OFF"}
          </button>
        </div>
      </div>

      {/* Log Output */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto terminal-scrollbar"
      >
        {filteredEvents.length === 0 ? (
          <div className="p-4 text-center">
            <div className="terminal-dim">
              <p>{"> No activity logged"}</p>
              <p>{"> Waiting for events..."}</p>
              <p className="mt-2 terminal-cursor">{"> "}</p>
            </div>
          </div>
        ) : (
          <div>
            {groupedEvents.map(({ event, count, groupId }) => (
              <LogLine
                key={groupId}
                event={event}
                agentNameMap={agentNameMap}
                isExpanded={expandedId === event.id}
                groupCount={count}
                onToggle={() =>
                  setExpandedId(expandedId === event.id ? null : event.id)
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LogLine({
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
  const toolSym = TOOL_SYMBOLS[event.tool || ""] || "...";
  const catPrefix = CATEGORY_PREFIX[event.category] || "??? ";
  const isError = event.category === "error" || !!event.error;
  const agentDisplayName =
    agentNameMap.get(event.agentId) ?? event.agentId.slice(0, 8);

  // Use formatted tool name for the title tooltip
  const formattedToolName = formatToolName(event.tool || event.hookType);

  return (
    <div
      className={`px-3 py-0.5 hover:bg-[#0a1a0a] cursor-pointer transition-colors border-l-2 ${
        isError
          ? "border-[#ff3333]"
          : isExpanded
            ? "border-[#00ff00]"
            : "border-transparent"
      }`}
      onClick={onToggle}
    >
      {/* Main log line */}
      <div className="flex items-center gap-0 whitespace-nowrap overflow-hidden">
        <span className="terminal-dim shrink-0 w-[60px]">
          {formatTimestamp(event.timestamp)}
        </span>
        <span
          className={`shrink-0 w-[36px] ml-1 ${isError ? "terminal-error" : "terminal-muted"}`}
        >
          {catPrefix}
        </span>
        <span className="shrink-0 w-[28px] ml-1 text-[#00ccff]" title={formattedToolName}>{toolSym}</span>
        {groupCount && groupCount > 1 && (
          <span className="shrink-0 ml-1 text-[#ffaa00]">x{groupCount}</span>
        )}
        <span className="terminal-dim shrink-0 ml-1" title={event.agentId}>
          [{agentDisplayName}]
        </span>
        {event.filePath && (
          <span className="text-[#00aa00] ml-2 truncate" title={event.filePath}>
            {extractFilename(event.filePath)}
          </span>
        )}
        {event.error && (
          <span className="terminal-error ml-2 truncate" title={event.error}>
            {event.error}
          </span>
        )}
        {event.duration !== undefined && (
          <span className="terminal-dim ml-auto shrink-0 pl-2">
            {event.duration}ms
          </span>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="ml-4 mt-1 mb-1 border-l border-[#1a3a1a] pl-2" onClick={(e) => e.stopPropagation()}>
          {event.input && (
            <div className="mb-1">
              <span className="terminal-muted">{">>> INPUT:"}</span>
              {showRawJson ? (
                <pre className="text-[10px] text-[#00aa00] whitespace-pre-wrap break-all mt-0.5 max-h-28 overflow-y-auto terminal-scrollbar bg-[#050505] p-1 border border-[#1a3a1a]">
                  {event.input}
                </pre>
              ) : (
                <pre className="text-[10px] text-[#00aa00] whitespace-pre-wrap break-all mt-0.5 max-h-28 overflow-y-auto terminal-scrollbar bg-[#050505] p-1 border border-[#1a3a1a]">
                  {formatEventInput(event.tool, event.input)}
                </pre>
              )}
            </div>
          )}
          {event.output && (
            <div className="mb-1">
              <span className="terminal-muted">{"<<< OUTPUT:"}</span>
              {showRawJson ? (
                <pre className="text-[10px] text-[#00aa00] whitespace-pre-wrap break-all mt-0.5 max-h-28 overflow-y-auto terminal-scrollbar bg-[#050505] p-1 border border-[#1a3a1a]">
                  {event.output}
                </pre>
              ) : (
                <pre className="text-[10px] text-[#00aa00] whitespace-pre-wrap break-all mt-0.5 max-h-28 overflow-y-auto terminal-scrollbar bg-[#050505] p-1 border border-[#1a3a1a]">
                  {formatEventOutput(event.output)}
                </pre>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            {event.duration !== undefined && (
              <span className="terminal-dim text-[10px]">
                {"--- duration: " + event.duration + "ms ---"}
              </span>
            )}
            {(event.input || event.output) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRawJson(!showRawJson);
                }}
                className="text-[9px] px-1 py-0.5 border border-[#1a3a1a] hover:border-[#00aa00] text-[#006600] hover:text-[#00ff00] transition-colors"
              >
                {showRawJson ? "[SUMMARY]" : "[RAW]"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
