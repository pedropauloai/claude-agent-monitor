import { useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore } from '../../../stores/session-store';
import { useEvents } from '../../../hooks/use-events';
import {
  formatTimestamp,
  getCategoryColor,
  truncatePath,
  formatDuration,
} from '../../../lib/formatters';
import type { AgentEvent, EventCategory, HookType } from '@cam/shared';

/* ------------------------------------------------------------------ */
/*  Lookup tables for event type styling                               */
/* ------------------------------------------------------------------ */

/** Background colors for the timeline dot / indicator per category */
const CATEGORY_DOT_BG: Record<string, string> = {
  tool_call: 'bg-blue-500',
  file_change: 'bg-emerald-500',
  command: 'bg-amber-500',
  message: 'bg-purple-500',
  lifecycle: 'bg-cyan-500',
  error: 'bg-red-500',
  compact: 'bg-gray-500',
  notification: 'bg-yellow-500',
};

/** Ring / glow color shown around the dot */
const CATEGORY_RING: Record<string, string> = {
  tool_call: 'ring-blue-500/30',
  file_change: 'ring-emerald-500/30',
  command: 'ring-amber-500/30',
  message: 'ring-purple-500/30',
  lifecycle: 'ring-cyan-500/30',
  error: 'ring-red-500/30',
  compact: 'ring-gray-500/30',
  notification: 'ring-yellow-500/30',
};

/** Small SVG icons rendered inside the timeline dot */
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  tool_call: (
    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m0 0L3.5 12.89a2.25 2.25 0 003.18 3.18l2.82-2.82m-2.82 2.82l5.1 5.1m5.1-10.2l5.1-5.1m0 0L21.5 7.11a2.25 2.25 0 00-3.18-3.18l-2.82 2.82m2.82-2.82l-5.1-5.1" />
    </svg>
  ),
  file_change: (
    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  command: (
    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3M3.75 3.75h16.5v16.5H3.75z" />
    </svg>
  ),
  message: (
    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.671 1.09-.085 2.17-.207 3.238-.364 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  ),
  lifecycle: (
    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
    </svg>
  ),
  error: (
    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  ),
  compact: (
    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  ),
  notification: (
    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getCategoryDotBg(category: EventCategory): string {
  return CATEGORY_DOT_BG[category] ?? 'bg-gray-500';
}

function getCategoryRing(category: EventCategory): string {
  return CATEGORY_RING[category] ?? 'ring-gray-500/30';
}

function getCategoryIcon(category: EventCategory): React.ReactNode {
  return CATEGORY_ICONS[category] ?? (
    <div className="w-1.5 h-1.5 rounded-full bg-white" />
  );
}

/** Produce a short human-readable label for a hook type */
function hookLabel(hookType: HookType): string {
  const labels: Record<string, string> = {
    PreToolUse: 'Tool Call',
    PostToolUse: 'Tool Result',
    Notification: 'Notification',
    Stop: 'Stopped',
    SubagentStop: 'Sub-agent Stopped',
    PreCompact: 'Compacting',
    PostCompact: 'Compacted',
    PreToolUseRejected: 'Tool Rejected',
    ToolError: 'Tool Error',
    SessionStart: 'Session Started',
  };
  return labels[hookType] ?? hookType;
}

/** Build a brief one-line description from an event */
function eventDescription(event: AgentEvent): string {
  if (event.error) return event.error;

  if (event.filePath) {
    return truncatePath(event.filePath, 50);
  }

  if (event.input) {
    const trimmed = event.input.replace(/\s+/g, ' ').trim();
    return trimmed.length > 80 ? trimmed.slice(0, 77) + '...' : trimmed;
  }

  if (event.output) {
    const trimmed = event.output.replace(/\s+/g, ' ').trim();
    return trimmed.length > 80 ? trimmed.slice(0, 77) + '...' : trimmed;
  }

  return hookLabel(event.hookType);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ModernTimeline() {
  const events = useEvents();
  const { session } = useSessionStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);

  // Sort events oldest-first so the timeline reads top-to-bottom
  const sortedEvents = useMemo(() => {
    return [...events].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [events]);

  // Auto-scroll to latest event when new events arrive
  useEffect(() => {
    if (bottomAnchorRef.current) {
      bottomAnchorRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [sortedEvents.length]);

  /* ---- Empty state ---- */
  if (!session || sortedEvents.length === 0) {
    return (
      <div className="h-28 border-t border-cam-border/50 bg-cam-surface/20 shrink-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-1.5">
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg
              className="w-5 h-5 text-cam-text-muted"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </motion.div>
          <span className="text-[10px] text-cam-text-muted">
            Waiting for events...
          </span>
        </div>
      </div>
    );
  }

  /* ---- Populated timeline ---- */
  return (
    <div className="h-36 border-t border-cam-border/50 bg-cam-surface/20 shrink-0 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-cam-border/20 shrink-0">
        <span className="text-[10px] uppercase tracking-wider text-cam-text-muted font-medium">
          Event Timeline
        </span>
        <span className="text-[10px] text-cam-text-muted tabular-nums">
          {sortedEvents.length} event{sortedEvents.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Scrollable timeline */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto modern-scrollbar px-4 py-2"
      >
        {/* Vertical line container */}
        <div className="relative">
          {/* The continuous vertical line */}
          <div className="absolute left-[7px] top-0 bottom-0 w-px bg-cam-border/40" />

          <AnimatePresence initial={false}>
            {sortedEvents.map((event, idx) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.3) }}
              >
                <TimelineEntry event={event} />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Auto-scroll anchor */}
          <div ref={bottomAnchorRef} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Individual timeline entry                                          */
/* ------------------------------------------------------------------ */

function TimelineEntry({ event }: { event: AgentEvent }) {
  const dotBg = getCategoryDotBg(event.category);
  const ring = getCategoryRing(event.category);
  const icon = getCategoryIcon(event.category);
  const textColor = getCategoryColor(event.category);
  const desc = eventDescription(event);

  const isError = event.category === 'error' || !!event.error;

  return (
    <div className="flex items-start gap-3 group mb-1.5 last:mb-0">
      {/* Dot / indicator */}
      <div
        className={`relative z-10 mt-0.5 w-[15px] h-[15px] rounded-full flex items-center justify-center shrink-0 ring-2 ${dotBg} ${ring}`}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex items-baseline gap-2">
        {/* Timestamp */}
        <span className="text-[9px] font-mono text-cam-text-muted shrink-0 tabular-nums w-14">
          {formatTimestamp(event.timestamp)}
        </span>

        {/* Hook type badge */}
        <span
          className={`text-[9px] font-semibold uppercase tracking-wide shrink-0 ${textColor}`}
        >
          {hookLabel(event.hookType)}
        </span>

        {/* Tool name (if present) */}
        {event.tool && (
          <span className="text-[10px] font-medium text-cam-text-secondary bg-cam-surface-2 rounded px-1 py-px shrink-0">
            {event.tool}
          </span>
        )}

        {/* Description / summary */}
        <span
          className={`text-[10px] truncate ${
            isError ? 'text-cam-error' : 'text-cam-text-muted'
          }`}
        >
          {desc}
        </span>

        {/* Duration badge */}
        {event.duration != null && event.duration > 0 && (
          <span className="text-[9px] text-cam-text-muted font-mono shrink-0 ml-auto">
            {formatDuration(event.duration)}
          </span>
        )}
      </div>
    </div>
  );
}
