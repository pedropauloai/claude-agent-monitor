import type { SpeechBubbleData } from '@claudecam/shared';
import { SpeechBubble } from '../agent-map/SpeechBubble.js';
import { ToolTrail } from '../agent-map/ToolTrail.js';

interface AgentOverlayProps {
  /** Agent ID for tool trail tracking */
  agentId: string;
  /** Display name */
  name: string;
  /** Accent color */
  color: string;
  /** Current activity description (e.g., "Reading file...") */
  activityLabel: string | null;
  /** Speech bubbles for this agent (already filtered) */
  speechBubbles: SpeechBubbleData[];
  /** Whether labels/overlays should be visible */
  showLabels: boolean;
  /** If true, hides the speech bubble (rendered separately above the agent) */
  hideBubble?: boolean;
}

/**
 * Pure HTML overlays rendered below each Spline agent canvas.
 *
 * Displays agent name, activity label, tool trail, and speech bubble.
 * Reuses existing SpeechBubble and ToolTrail components from agent-map/.
 */
export function AgentOverlay({
  agentId,
  name,
  color,
  activityLabel,
  speechBubbles,
  showLabels,
  hideBubble = false,
}: AgentOverlayProps) {
  const latestBubble = speechBubbles.length > 0
    ? speechBubbles[speechBubbles.length - 1]
    : null;

  return (
    <div className="flex flex-col items-center gap-1 mt-2 select-none max-w-[240px]">
      {showLabels && (
        <>
          {/* Agent name */}
          <span
            className="text-xs font-mono font-bold tracking-wide"
            style={{ color, textShadow: `0 0 8px ${color}40` }}
          >
            {name}
          </span>

          {/* Activity label */}
          {activityLabel && (
            <span className="text-[10px] font-mono text-zinc-400 truncate max-w-full">
              {activityLabel}
            </span>
          )}

          {/* Tool trail (last N tools) */}
          <ToolTrail agentId={agentId} color={color} />
        </>
      )}

      {/* Speech bubble (most recent) — hidden when rendered separately above */}
      {!hideBubble && latestBubble && (
        <div className="relative mt-1">
          <SpeechBubble
            key={latestBubble.id}
            bubble={latestBubble}
            color={color}
          />
        </div>
      )}
    </div>
  );
}
