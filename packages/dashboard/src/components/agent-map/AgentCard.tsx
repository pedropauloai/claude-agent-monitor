import { memo, useRef, useEffect, useState } from 'react';
import type { AgentAnimationState, AgentPose } from '@claudecam/shared';
import { ToolTrail } from './ToolTrail';
import { AgentTimer } from './AgentTimer';
import { useAgentMapStore } from '../../stores/agent-map-store';

interface AgentCardProps {
  agentId: string;
  name: string;
  agentType: string | null;
  color: string;
  animationState: AgentAnimationState;
  pose: AgentPose;
  activityLabel: string | null;
  lastTool: string | null;
  lastActivityAt: string | null;
  agentStatus: string | null;
  isSelected: boolean;
  compact?: boolean;
  onClick: () => void;
}

/** Get a short symbol for the current pose */
function getPoseIndicator(pose: AgentPose): string {
  switch (pose) {
    case 'coding': return '</>';
    case 'reading': return '{ }';
    case 'terminal': return '>_';
    case 'talking': return '...';
    case 'searching': return '?';
    case 'managing': return '[ ]';
    case 'celebrating': return '***';
    case 'idle': return '';
    default: return '';
  }
}

/** Get the first letter of the agent name (uppercase) for the avatar */
function getInitial(name: string): string {
  return (name.charAt(0) || '?').toUpperCase();
}

function AgentCardInner({
  agentId,
  name,
  agentType,
  color,
  animationState,
  pose,
  activityLabel,
  lastActivityAt,
  agentStatus,
  compact = false,
  isSelected,
  onClick,
}: AgentCardProps) {
  const showLabels = useAgentMapStore((s) => s.showLabels);

  const wasSelectedRef = useRef(isSelected);
  const [justSelected, setJustSelected] = useState(false);

  useEffect(() => {
    if (isSelected && !wasSelectedRef.current) {
      setJustSelected(true);
      const timer = setTimeout(() => setJustSelected(false), 500);
      return () => clearTimeout(timer);
    }
    wasSelectedRef.current = isSelected;
  }, [isSelected]);

  // --- Spawn detection: portal animation on first render ---
  const hasRenderedRef = useRef(false);
  const [isNewSpawn, setIsNewSpawn] = useState(false);

  useEffect(() => {
    if (!hasRenderedRef.current) {
      hasRenderedRef.current = true;
      setIsNewSpawn(true);
      const timer = setTimeout(() => setIsNewSpawn(false), 800);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Shutdown detection ---
  const prevAnimStateRef = useRef<AgentAnimationState>(animationState);
  const [isShuttingDown, setIsShuttingDown] = useState(false);

  useEffect(() => {
    if (
      animationState === 'shutdown' &&
      prevAnimStateRef.current !== 'shutdown'
    ) {
      setIsShuttingDown(true);
    } else if (animationState !== 'shutdown') {
      setIsShuttingDown(false);
    }
    prevAnimStateRef.current = animationState;
  }, [animationState]);

  const spawnClasses = isNewSpawn ? 'agent-spawn agent-spawn-portal' : '';
  const shutdownClasses = isShuttingDown ? 'agent-shutdown-dissolve' : '';

  const indicator = getPoseIndicator(pose);
  const initial = getInitial(name);

  if (compact) {
    // Compact mode for InactiveBar
    return (
      <div
        className={`agent-card-compact ${isSelected ? 'selected' : ''} ${justSelected ? 'just-selected' : ''} ${shutdownClasses}`}
        style={{ '--agent-color': color } as React.CSSProperties}
        onClick={onClick}
        title={`${name}${activityLabel ? ` - ${activityLabel}` : ''}`}
      >
        {/* Compact avatar circle */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}33` }}
        >
          <span
            className="text-xs font-bold font-mono"
            style={{ color }}
          >
            {initial}
          </span>
        </div>
        {showLabels && (
          <span className="agent-card-compact-name" style={{ color }}>
            {name}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`agent-card ${isSelected ? 'selected' : ''} ${justSelected ? 'just-selected' : ''} ${spawnClasses} ${shutdownClasses}`}
      data-agent-id={agentId}
      style={{ '--agent-color': color } as React.CSSProperties}
      onClick={onClick}
      title={`${name} (${pose})${activityLabel ? ` - ${activityLabel}` : ''}`}
    >
      {/* Avatar circle */}
      <div className="agent-card-sprite flex items-center justify-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${color}33` }}
        >
          <span
            className="text-2xl font-bold font-mono"
            style={{ color }}
          >
            {initial}
          </span>
        </div>
      </div>

      {/* Info section below avatar */}
      <div className="agent-card-info">
        {/* Name + type badge + pose indicator + timer */}
        <div className="agent-card-name-row">
          <span className="agent-card-name" style={{ color }}>
            {name}
          </span>
          {agentType && (
            <span className="agent-card-type-badge">
              {agentType}
            </span>
          )}
          {indicator && (
            <span className="agent-card-pose-indicator">{indicator}</span>
          )}
          {showLabels && lastActivityAt && agentStatus && (
            <AgentTimer lastActivityAt={lastActivityAt} status={agentStatus} />
          )}
        </div>

        {/* Activity label */}
        {showLabels && activityLabel && (
          <span className="agent-card-label">
            {activityLabel}
          </span>
        )}

        {/* Tool trail - last 5 tools */}
        {showLabels && (
          <ToolTrail agentId={agentId} color={color} />
        )}
      </div>
    </div>
  );
}

export const AgentCard = memo(AgentCardInner, (prev, next) => {
  return (
    prev.agentId === next.agentId &&
    prev.animationState === next.animationState &&
    prev.pose === next.pose &&
    prev.activityLabel === next.activityLabel &&
    prev.lastTool === next.lastTool &&
    prev.isSelected === next.isSelected &&
    prev.color === next.color &&
    prev.name === next.name &&
    prev.agentType === next.agentType &&
    prev.compact === next.compact &&
    prev.lastActivityAt === next.lastActivityAt &&
    prev.agentStatus === next.agentStatus
  );
});
