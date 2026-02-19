import { useRef, useEffect, useMemo } from 'react';
import { useSessionStore } from '../../../stores/session-store';
import { useEvents } from '../../../hooks/use-events';
import {
  formatTimestamp,
  truncatePath,
  formatDuration,
} from '../../../lib/formatters';
import type { AgentEvent, EventCategory, HookType } from '@claudecam/shared';

/** Pixel-styled category colors */
const CATEGORY_COLORS: Record<string, string> = {
  tool_call: 'var(--pixel-cyan)',
  file_change: 'var(--pixel-green)',
  command: 'var(--pixel-orange)',
  message: 'var(--pixel-purple)',
  lifecycle: 'var(--pixel-blue)',
  error: 'var(--pixel-error)',
  compact: 'var(--pixel-text-dim)',
  notification: 'var(--pixel-gold)',
};

/** Pixel sprite icons for categories */
const CATEGORY_SPRITES: Record<string, string> = {
  tool_call: '\u2694',
  file_change: '\📦',
  command: '\💻',
  message: '\💬',
  lifecycle: '\🔄',
  error: '\u2620',
  compact: '\📦',
  notification: '\🔔',
};

function getCatColor(category: EventCategory): string {
  return CATEGORY_COLORS[category] ?? 'var(--pixel-text-dim)';
}

function getCatSprite(category: EventCategory): string {
  return CATEGORY_SPRITES[category] ?? '\u25A0';
}

function hookLabel(hookType: HookType): string {
  const labels: Record<string, string> = {
    PreToolUse: 'CAST',
    PostToolUse: 'RESULT',
    Notification: 'ALERT',
    Stop: 'HALT',
    SubagentStop: 'SUMMON END',
    PreCompact: 'COMPRESS',
    PostCompact: 'COMPRESSED',
    PreToolUseRejected: 'BLOCKED',
    ToolError: 'MISFIRE',
    SessionStart: 'GAME START',
  };
  return labels[hookType] ?? hookType;
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

export function PixelTimeline() {
  const events = useEvents();
  const { session } = useSessionStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const sortedEvents = useMemo(() => {
    return [...events].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [events]);

  // Auto-scroll to the right (latest) when events arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [sortedEvents.length]);

  if (!session || sortedEvents.length === 0) {
    return (
      <div
        className="h-28 shrink-0 flex items-center justify-center"
        style={{ borderTop: '3px solid var(--pixel-border)', background: 'var(--pixel-bg-dark)' }}
      >
        <div className="flex flex-col items-center gap-1">
          <span className="pixel-text-base pixel-pulse">\🎮</span>
          <span className="pixel-text-xs" style={{ color: 'var(--pixel-text-muted)' }}>
            LOADING STAGE...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-36 shrink-0 flex flex-col"
      style={{ borderTop: '3px solid var(--pixel-border)', background: 'var(--pixel-bg-dark)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-1.5 shrink-0"
        style={{ borderBottom: '2px solid var(--pixel-border)' }}
      >
        <span className="pixel-text-xs" style={{ color: 'var(--pixel-gold)' }}>
          \🎮 STAGE PROGRESS
        </span>
        <span className="pixel-text-xs" style={{ color: 'var(--pixel-text-dim)' }}>
          {sortedEvents.length} EVENT{sortedEvents.length !== 1 ? 'S' : ''}
        </span>
      </div>

      {/* Scrollable horizontal timeline (platformer style) */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-hidden pixel-scrollbar"
        style={{ whiteSpace: 'nowrap' }}
      >
        <div className="inline-flex items-end h-full px-4 gap-0 relative" style={{ minWidth: 'max-content' }}>
          {/* Ground line */}
          <div
            className="absolute bottom-6 left-0 right-0 h-[3px]"
            style={{ background: 'var(--pixel-border)' }}
          />

          {sortedEvents.map((event, idx) => {
            const color = getCatColor(event.category);
            const sprite = getCatSprite(event.category);
            const isError = event.category === 'error' || !!event.error;
            const desc = eventDescription(event);

            return (
              <div
                key={event.id}
                className="inline-flex flex-col items-center justify-end pb-2 group"
                style={{ minWidth: '60px', maxWidth: '80px', cursor: 'default' }}
              >
                {/* Event info tooltip on hover */}
                <div
                  className="hidden group-hover:flex flex-col items-center mb-1 pixel-dialog"
                  style={{
                    position: 'absolute',
                    bottom: '90px',
                    zIndex: 50,
                    maxWidth: '200px',
                    whiteSpace: 'normal',
                  }}
                >
                  <span className="pixel-text-xs font-bold" style={{ color }}>
                    {hookLabel(event.hookType)}
                  </span>
                  {event.tool && (
                    <span className="pixel-text-xs" style={{ color: 'var(--pixel-text)' }}>
                      {event.tool}
                    </span>
                  )}
                  <span className="pixel-text-xs mt-1" style={{ color: 'var(--pixel-text-muted)' }}>
                    {desc.slice(0, 80)}
                  </span>
                  {event.duration != null && event.duration > 0 && (
                    <span className="pixel-text-xs mt-0.5" style={{ color: 'var(--pixel-text-dim)' }}>
                      {formatDuration(event.duration)}
                    </span>
                  )}
                </div>

                {/* Sprite / platform block */}
                <div
                  className={`pixel-text-base mb-1 ${isError ? 'pixel-shake' : ''}`}
                  style={{
                    filter: isError ? 'drop-shadow(0 0 4px var(--pixel-error))' : `drop-shadow(0 0 3px ${color})`,
                  }}
                >
                  {sprite}
                </div>

                {/* Platform block */}
                <div
                  className="w-6 h-3"
                  style={{
                    background: color,
                    boxShadow: `inset -2px -2px 0 rgba(0,0,0,0.3), inset 2px 2px 0 rgba(255,255,255,0.1)`,
                  }}
                />

                {/* Timestamp */}
                <span className="pixel-text-xs mt-1" style={{ color: 'var(--pixel-text-dim)', whiteSpace: 'nowrap' }}>
                  {formatTimestamp(event.timestamp).slice(0, 5)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
