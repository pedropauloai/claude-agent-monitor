import { memo, useRef, useEffect, useState } from 'react';
import type { AgentAnimationState, AgentPose } from '@cam/shared';
import { PixelCharacter } from './PixelCharacter';
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

/** Pose-specific CSS animation class */
function getPoseAnimClass(pose: AgentPose, animationState: AgentAnimationState): string {
  if (animationState === 'error') return 'sprite-anim-error';
  if (animationState === 'shutdown') return 'sprite-anim-shutdown';

  switch (pose) {
    case 'coding': return 'sprite-anim-coding';
    case 'reading': return 'sprite-anim-reading';
    case 'terminal': return 'sprite-anim-terminal';
    case 'talking': return 'sprite-anim-talking';
    case 'searching': return 'sprite-anim-searching';
    case 'managing': return 'sprite-anim-managing';
    case 'celebrating': return 'sprite-anim-celebrating';
    case 'idle':
    default:
      return 'sprite-anim-idle';
  }
}

/** Get a short emoji/symbol for the current pose */
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
  const animClass = getPoseAnimClass(pose, animationState);

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

  // --- Shutdown detection: dissolve + pixel scatter ---
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

  if (compact) {
    // Compact mode for InactiveBar
    return (
      <div
        className={`agent-card-compact ${animClass} ${isSelected ? 'selected' : ''} ${justSelected ? 'just-selected' : ''} ${shutdownClasses}`}
        style={{ '--agent-color': color } as React.CSSProperties}
        onClick={onClick}
        title={`${name}${activityLabel ? ` - ${activityLabel}` : ''}`}
      >
        <PixelCharacter
          color={color}
          animationState={animationState}
          pose={pose}
          pixelSize={3}
        />
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
      className={`agent-card ${animClass} ${isSelected ? 'selected' : ''} ${justSelected ? 'just-selected' : ''} ${spawnClasses} ${shutdownClasses}`}
      data-agent-id={agentId}
      style={{ '--agent-color': color } as React.CSSProperties}
      onClick={onClick}
      title={`${name} (${pose})${activityLabel ? ` - ${activityLabel}` : ''}`}
    >
      {/* Sprite container with pose animation */}
      <div className="agent-card-sprite">
        <PixelCharacter
          color={color}
          animationState={animationState}
          pose={pose}
          pixelSize={6}
        />

        {/* Pose-specific overlays */}
        {pose === 'coding' && animationState !== 'error' && (
          <div className="coding-particles" style={{ color }}>
            <span className="code-char">&lt;</span>
            <span className="code-char">/</span>
            <span className="code-char">&gt;</span>
          </div>
        )}

        {pose === 'terminal' && animationState !== 'error' && (
          <div className="terminal-cursor" />
        )}

        {animationState === 'error' && (
          <div className="error-indicator" style={{ color: '#ef4444' }}>!</div>
        )}

        {pose === 'celebrating' && (
          <div className="confetti-container">
            <div className="confetti-piece" />
            <div className="confetti-piece" />
            <div className="confetti-piece" />
            <div className="confetti-piece" />
          </div>
        )}

        {animationState === 'shutdown' && (
          <>
            <div className="zzz-container">
              <span className="zzz-letter">z</span>
              <span className="zzz-letter">Z</span>
              <span className="zzz-letter">z</span>
            </div>
            {/* Pixel scatter dissolve effect on shutdown transition */}
            {isShuttingDown && (
              <div className="shutdown-scatter-container">
                <div className="scatter-pixel" />
                <div className="scatter-pixel" />
                <div className="scatter-pixel" />
                <div className="scatter-pixel" />
                <div className="scatter-pixel" />
                <div className="scatter-pixel" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Info section below sprite */}
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
