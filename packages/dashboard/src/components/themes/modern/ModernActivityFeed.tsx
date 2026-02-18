import { useRef, useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionStore } from "../../../stores/session-store";
import { useFilterStore } from "../../../stores/filter-store";
import { useSettingsStore } from "../../../stores/settings-store";
import { useEvents } from "../../../hooks/use-events";
import { formatTimestamp, getCategoryColor } from "../../../lib/formatters";
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

const TOOL_ICONS: Record<string, string> = {
  Edit: "\u270F",
  Write: "\u2795",
  Read: "\u{1F441}",
  Bash: "\u{1F4BB}",
  Grep: "\u{1F50D}",
  Glob: "\u{1F4C2}",
  TaskCreate: "\u{2795}",
  TaskUpdate: "\u{1F504}",
  TaskList: "\u{1F4CB}",
  SendMessage: "\u{1F4AC}",
  WebFetch: "\u{1F310}",
  WebSearch: "\u{1F50E}",
};

export function ModernActivityFeed() {
  const events = useEvents();
  const agents = useSessionStore((s) => s.agents);
  const { searchQuery, setSearchQuery } = useFilterStore();
  const followMode = useSettingsStore((s) => s.followMode);
  const hidePolling = useSettingsStore((s) => s.hidePolling);
  const toggleFollowMode = useSettingsStore((s) => s.toggleFollowMode);
  const toggleHidePolling = useSettingsStore((s) => s.toggleHidePolling);

  // Build agent name lookup map
  const agentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const agent of agents) {
      map.set(agent.id, getAgentDisplayName(agent.id, agent.name || agent.id, agent.type ?? undefined));
    }
    return map;
  }, [agents]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    <div className="h-full flex flex-col">
      {/* Feed Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-cam-border/30 shrink-0">
        <span className="text-[10px] uppercase tracking-wider text-cam-text-muted font-medium">
          Activity Feed ({filteredEvents.length})
        </span>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-32 h-6 bg-cam-surface-2 border border-cam-border rounded-md px-2 text-[11px] text-cam-text placeholder:text-cam-text-muted focus:outline-none focus:border-cam-accent/50 transition-colors"
            />
          </div>

          {/* Hide Polling Toggle */}
          <button
            onClick={toggleHidePolling}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              hidePolling
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-cam-surface-2 text-cam-text-muted border border-cam-border"
            }`}
            title="Hide TaskList/TaskGet polling events"
          >
            {hidePolling ? "Polling: Off" : "Polling"}
          </button>

          {/* Follow Mode */}
          <button
            onClick={toggleFollowMode}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              followMode
                ? "bg-cam-accent/20 text-cam-accent border border-cam-accent/30"
                : "bg-cam-surface-2 text-cam-text-muted border border-cam-border"
            }`}
          >
            {followMode ? "Following" : "Follow"}
          </button>
        </div>
      </div>

      {/* Event List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto modern-scrollbar">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-12 h-12 rounded-full bg-cam-surface-2 border border-cam-border flex items-center justify-center mb-3">
              <svg
                className="w-6 h-6 text-cam-text-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <p className="text-sm text-cam-text-muted">No activity yet</p>
            <p className="text-xs text-cam-text-muted mt-1">
              Events will appear here in real-time
            </p>
          </div>
        ) : (
          <div className="divide-y divide-cam-border/20">
            <AnimatePresence initial={false}>
              {groupedEvents.map(({ event, count, groupId }) => (
                <motion.div
                  key={groupId}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
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
                </motion.div>
              ))}
            </AnimatePresence>
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
  const icon = TOOL_ICONS[event.tool || ""] || "\u25CF";
  const categoryColor = getCategoryColor(event.category);
  const agentDisplayName = agentNameMap.get(event.agentId) ?? event.agentId;
  const displayToolName = formatToolName(event.tool || event.hookType);

  return (
    <div
      className={`px-4 py-2 hover:bg-cam-surface/40 cursor-pointer transition-colors ${
        isExpanded ? "bg-cam-surface/30" : ""
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <span className="text-sm mt-0.5 w-5 text-center shrink-0">{icon}</span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${categoryColor}`} title={event.tool || event.hookType}>
              {displayToolName}
              {groupCount && groupCount > 1 && (
                <span className="ml-1 px-1 py-0 rounded bg-cam-surface-2 text-cam-text-muted text-[9px]">
                  x{groupCount}
                </span>
              )}
            </span>
            <span
              className="text-[10px] text-cam-text-muted"
              title={event.agentId}
            >
              {agentDisplayName}
            </span>
            {event.filePath && (
              <span
                className="text-[10px] text-cam-text-secondary font-mono truncate"
                title={event.filePath}
              >
                {extractFilename(event.filePath)}
              </span>
            )}
          </div>

          {event.error && (
            <p
              className="text-[11px] text-cam-error mt-0.5"
              title={event.error}
            >
              {event.error}
            </p>
          )}

          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                  {event.input && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-cam-text-muted">
                        Input
                      </span>
                      {showRawJson ? (
                        <pre className="mt-0.5 text-[11px] text-cam-text-secondary font-mono bg-cam-bg rounded p-2 overflow-x-auto max-h-32 modern-scrollbar whitespace-pre-wrap break-all">
                          {event.input}
                        </pre>
                      ) : (
                        <p className="mt-0.5 text-[11px] text-cam-text-secondary bg-cam-bg rounded p-2 break-words">
                          <span className="font-mono">{formatEventInput(event.tool, event.input)}</span>
                        </p>
                      )}
                    </div>
                  )}
                  {event.output && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-cam-text-muted">
                        Output
                      </span>
                      {showRawJson ? (
                        <pre className="mt-0.5 text-[11px] text-cam-text-secondary font-mono bg-cam-bg rounded p-2 overflow-x-auto max-h-32 modern-scrollbar whitespace-pre-wrap break-all">
                          {event.output}
                        </pre>
                      ) : (
                        <p className="mt-0.5 text-[11px] text-cam-text-secondary bg-cam-bg rounded p-2 break-words">
                          <span className="font-mono">{formatEventOutput(event.output)}</span>
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    {event.duration !== undefined && (
                      <span className="text-[10px] text-cam-text-muted">
                        Duration: {event.duration}ms
                      </span>
                    )}
                    {(event.input || event.output) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowRawJson(!showRawJson);
                        }}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-cam-surface-2 text-cam-text-muted border border-cam-border hover:text-cam-text hover:border-cam-accent/30 transition-colors"
                      >
                        {showRawJson ? "Resumo" : "Raw JSON"}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-cam-text-muted font-mono shrink-0">
          {formatTimestamp(event.timestamp)}
        </span>
      </div>
    </div>
  );
}
