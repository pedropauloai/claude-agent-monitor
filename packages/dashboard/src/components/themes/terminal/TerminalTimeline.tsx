import { useRef, useEffect, useMemo } from 'react';
import { useSessionStore } from '../../../stores/session-store';
import { useEvents } from '../../../hooks/use-events';
import { formatTimestamp, truncatePath } from '../../../lib/formatters';
import type { AgentEvent, EventCategory, HookType } from '@claudecam/shared';

const CATEGORY_CHARS: Record<string, string> = {
  tool_call: '*',
  file_change: '+',
  command: '$',
  message: '@',
  lifecycle: '#',
  error: '!',
  compact: '-',
  notification: '?',
};

function getCategoryChar(category: EventCategory): string {
  return CATEGORY_CHARS[category] ?? '.';
}

function hookLabel(hookType: HookType): string {
  const labels: Record<string, string> = {
    PreToolUse: 'CALL',
    PostToolUse: 'RSLT',
    Notification: 'NOTF',
    Stop: 'STOP',
    SubagentStop: 'SSTP',
    PreCompact: 'CMPC',
    PostCompact: 'CMPD',
    PreToolUseRejected: 'REJC',
    ToolError: 'TERR',
    SessionStart: 'INIT',
  };
  return labels[hookType] ?? hookType.slice(0, 4).toUpperCase();
}

function eventDescription(event: AgentEvent): string {
  if (event.error) return event.error;
  if (event.filePath) return truncatePath(event.filePath, 40);
  if (event.input) {
    const trimmed = event.input.replace(/\s+/g, ' ').trim();
    return trimmed.length > 60 ? trimmed.slice(0, 57) + '...' : trimmed;
  }
  if (event.output) {
    const trimmed = event.output.replace(/\s+/g, ' ').trim();
    return trimmed.length > 60 ? trimmed.slice(0, 57) + '...' : trimmed;
  }
  return hookLabel(event.hookType);
}

export function TerminalTimeline() {
  const events = useEvents();
  const { session } = useSessionStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const sortedEvents = useMemo(() => {
    return [...events].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [events]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [sortedEvents.length]);

  if (!session || sortedEvents.length === 0) {
    return (
      <div className="h-28 border-t border-[#1a3a1a] bg-[#080808] shrink-0 flex items-center justify-center font-mono text-[11px]">
        <div className="terminal-dim text-center">
          <p>{'--- TIMELINE ---'}</p>
          <p className="terminal-cursor mt-1">{'Waiting for events...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-36 border-t border-[#1a3a1a] bg-[#080808] shrink-0 flex flex-col font-mono text-[11px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-[#1a3a1a] shrink-0">
        <span className="terminal-muted">{'## TIMELINE ##'}</span>
        <span className="terminal-dim">
          {sortedEvents.length} event{sortedEvents.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Timeline entries */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto terminal-scrollbar px-3 py-1">
        {sortedEvents.map((event, idx) => {
          const isError = event.category === 'error' || !!event.error;
          const ch = getCategoryChar(event.category);
          const isLast = idx === sortedEvents.length - 1;

          return (
            <div key={event.id} className="flex items-start gap-0 leading-tight">
              {/* Vertical line + marker */}
              <span className="terminal-dim shrink-0 w-[12px] text-center">
                {isLast ? '\u2514' : '\u251C'}
              </span>
              <span className={`shrink-0 w-[12px] text-center font-bold ${isError ? 'terminal-error' : 'text-[#00ff00]'}`}>
                {ch}
              </span>
              <span className="terminal-dim shrink-0 w-[12px] text-center">
                {'\u2500'}
              </span>

              {/* Timestamp */}
              <span className="terminal-dim shrink-0 w-[56px] text-[10px]">
                {formatTimestamp(event.timestamp)}
              </span>

              {/* Hook label */}
              <span className={`shrink-0 w-[36px] text-[10px] ${isError ? 'terminal-error' : 'terminal-muted'}`}>
                {hookLabel(event.hookType)}
              </span>

              {/* Tool */}
              {event.tool && (
                <span className="shrink-0 text-[10px] text-[#00ccff] mr-1">
                  {event.tool}
                </span>
              )}

              {/* Description */}
              <span className={`truncate text-[10px] ${isError ? 'terminal-error' : 'terminal-dim'}`}>
                {eventDescription(event)}
              </span>

              {/* Duration */}
              {event.duration != null && event.duration > 0 && (
                <span className="terminal-dim text-[9px] shrink-0 ml-auto pl-1">
                  {event.duration}ms
                </span>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
