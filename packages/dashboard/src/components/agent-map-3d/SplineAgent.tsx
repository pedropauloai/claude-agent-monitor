import Spline from '@splinetool/react-spline';
import { useState, useCallback, useRef, useEffect, memo } from 'react';
import type { AgentPose, AgentAnimationState } from '@claudecam/shared';
import { SPLINE_URLS, AGENT_CARD_SIZE, SPLINE_RENDER_SCALE } from './scene-constants.js';

/** Spline canvas renders at this size for zoom clarity */
const RENDER_SIZE = AGENT_CARD_SIZE * SPLINE_RENDER_SCALE;
/** CSS scale factor to shrink the oversized canvas back to visual size */
const COUNTER_SCALE = 1 / SPLINE_RENDER_SCALE;

/**
 * Minimal type for accessing Spline runtime internals.
 *
 * The watermark is a WebGL shader pass (logoOverlayPass) rendered directly
 * on the canvas — NOT an HTML DOM element. The only way to disable it is
 * via the internal renderer pipeline after the scene loads.
 */
interface SplineInternals {
  _renderer?: {
    pipeline?: {
      setWatermark: (texture: null) => void;
      logoOverlayPass?: { enabled: boolean };
    };
  };
  /** Stops the internal requestAnimationFrame loop */
  stop?: () => void;
  /** Restarts the internal RAF loop */
  play?: () => void;
}

interface SplineAgentProps {
  /** Which robot model to render: 'main' (NEXBOT) or 'sub' (GENKUB) */
  modelType: 'main' | 'sub';
  /** Whether this agent is currently selected */
  isSelected: boolean;
  /** Whether this agent is currently being dragged */
  isDragging?: boolean;
  /** Click handler for selection toggle */
  onClick: () => void;
  /** Agent accent color for selection glow */
  color: string;
  /** Current visual pose based on what the agent is doing */
  pose: AgentPose;
  /** Current animation state (idle, working, error, etc.) */
  animationState: AgentAnimationState;
}

/**
 * Maps pose + animationState to a CSS glow effect around the agent.
 *
 * The glow color reflects the agent's current activity:
 * - coding → cyan (code editor vibe)
 * - terminal → green (terminal/matrix vibe)
 * - searching → blue, pulsing (scanning)
 * - talking → purple, pulsing (communication)
 * - celebrating → gold, pulsing (victory)
 * - error → red, pulsing (alert)
 * - idle → subtle agent color
 */
function getGlowStyle(
  pose: AgentPose,
  animationState: AgentAnimationState,
  agentColor: string,
): { boxShadow: string; animation?: string } {
  let glowColor: string;
  let intensity: number;
  let shouldPulse = false;

  // State overrides take priority
  if (animationState === 'error') {
    glowColor = '#ef4444';
    intensity = 30;
    shouldPulse = true;
  } else if (animationState === 'shutdown') {
    glowColor = '#6b7280';
    intensity = 8;
  } else {
    // Pose-specific glow
    switch (pose) {
      case 'coding':
        glowColor = '#22d3ee'; intensity = 20; break;
      case 'terminal':
        glowColor = '#22c55e'; intensity = 20; break;
      case 'searching':
        glowColor = '#3b82f6'; intensity = 25; shouldPulse = true; break;
      case 'talking':
        glowColor = '#a855f7'; intensity = 20; shouldPulse = true; break;
      case 'celebrating':
        glowColor = '#fbbf24'; intensity = 30; shouldPulse = true; break;
      case 'managing':
        glowColor = '#f97316'; intensity = 15; break;
      case 'reading':
        glowColor = '#8b5cf6'; intensity = 15; break;
      case 'idle':
      default:
        glowColor = agentColor; intensity = 10; break;
    }
  }

  return {
    boxShadow: `0 0 ${intensity}px ${glowColor}50, 0 0 ${intensity * 2}px ${glowColor}20`,
    animation: shouldPulse ? 'cam-pulse-glow 2s ease-in-out infinite' : undefined,
  };
}

/**
 * Single agent 3D robot rendered via @splinetool/react-spline.
 *
 * Each instance creates its own canvas with the Spline runtime.
 * The .splinecode file is cached by the browser after the first load.
 *
 * The robot stays completely still — no float, shake, or bounce animations.
 * Activity is communicated through:
 * 1. Three.js 3D indicators — floating 3D objects above the robot
 * 2. Pose-reactive ambient glow (colored aura changes by activity)
 * 3. Selection ring (when agent is clicked)
 * 4. Activity label + tool trail (in AgentOverlay)
 * 5. Connection lines (in ConnectionLines3D)
 *
 * NOTE: Each <Spline> creates a WebGL context. Browsers support 8-16
 * simultaneous contexts. For typical CAM usage (1-5 agents) this is fine.
 */
export const SplineAgent = memo(function SplineAgent({
  modelType,
  isSelected,
  isDragging = false,
  onClick,
  color,
  pose,
  animationState,
}: SplineAgentProps) {
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleLoad = useCallback((app: unknown) => {
    const internals = app as SplineInternals;

    // Disable the watermark shader pass, then restart the animation loop.
    // setWatermark(null) can disrupt the render pipeline and freeze the
    // model — calling play() afterwards ensures the RAF loop resumes.
    try {
      const pipeline = internals._renderer?.pipeline;
      if (pipeline?.logoOverlayPass) {
        pipeline.logoOverlayPass.enabled = false;
      }
      pipeline?.setWatermark(null);
    } catch {
      // Silently ignore — internal API may change between runtime versions
    }

    // Restart animation loop after pipeline modification
    try {
      internals.play?.();
    } catch {
      // play() may not exist in all runtime versions
    }

    setIsLoading(false);
  }, []);

  // Keep isDragging in a ref so the event listener always reads the latest value
  const isDraggingRef = useRef(isDragging);
  isDraggingRef.current = isDragging;

  // Forward global pointer events to the Spline canvas so the robot
  // tracks the mouse even when the cursor is outside its canvas.
  // Disabled during drag to prevent the robot from rotating while being moved.
  useEffect(() => {
    if (isLoading) return;
    const container = containerRef.current;
    if (!container) return;

    const canvas = container.querySelector('canvas');
    if (!canvas) return;

    let isOverCanvas = false;

    function onEnter() { isOverCanvas = true; }
    function onLeave() { isOverCanvas = false; }

    function onGlobalPointerMove(e: PointerEvent) {
      // Block ALL pointer forwarding during drag — the robot should
      // stay still while being repositioned by the user.
      if (isDraggingRef.current) return;

      // Only forward when the mouse is OUTSIDE the canvas — inside,
      // Spline receives the native events directly.
      if (isOverCanvas) return;

      // Only forward when pointer is inside the agent container bounds.
      // This prevents interference with resize handles and other panels.
      const rect = container!.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;

      canvas!.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: e.clientX,
          clientY: e.clientY,
          pointerId: 1,
          pointerType: 'mouse',
          bubbles: false,
        }),
      );
    }

    canvas.addEventListener('pointerenter', onEnter);
    canvas.addEventListener('pointerleave', onLeave);
    window.addEventListener('pointermove', onGlobalPointerMove);

    return () => {
      canvas.removeEventListener('pointerenter', onEnter);
      canvas.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('pointermove', onGlobalPointerMove);
    };
  }, [isLoading]);

  const glowStyle = getGlowStyle(pose, animationState, color);

  return (
    <div
      ref={containerRef}
      className="relative transition-transform duration-200 hover:scale-[1.03] overflow-hidden"
      style={{
        width: `${AGENT_CARD_SIZE}px`,
        height: `${AGENT_CARD_SIZE}px`,
      }}
      onClick={(e) => {
        e.stopPropagation(); // don't trigger drag
        onClick();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
    >
      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{
              borderTopColor: 'transparent',
              borderRightColor: `${color}40`,
              borderBottomColor: `${color}40`,
              borderLeftColor: `${color}40`,
            }}
          />
        </div>
      )}

      {/* Spline 3D robot model — rendered at RENDER_SIZE for zoom clarity,
          then CSS counter-scaled to fit AGENT_CARD_SIZE visually.
          Global pointer forwarding enables mouse tracking even when
          cursor is outside the canvas. */}
      <div
        style={{
          width: `${RENDER_SIZE}px`,
          height: `${RENDER_SIZE}px`,
          transform: `scale(${COUNTER_SCALE})`,
          transformOrigin: 'top left',
        }}
      >
        <Spline
          scene={SPLINE_URLS[modelType]}
          onLoad={handleLoad}
          style={{
            width: '100%',
            height: '100%',
            opacity: isLoading ? 0 : 1,
            transition: 'opacity 0.5s ease-in',
            // Block native pointer events during drag so the robot
            // doesn't rotate while being repositioned
            pointerEvents: isDragging ? 'none' : undefined,
          }}
        />
      </div>

      {/* Pose-reactive ambient glow (extends 8px beyond container) */}
      {!isLoading && (
        <div
          className="absolute inset-[-8px] rounded-2xl pointer-events-none transition-all duration-700"
          style={glowStyle}
        />
      )}

      {/* Selection glow ring */}
      {isSelected && (
        <div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{
            boxShadow: `0 0 24px ${color}40, inset 0 0 12px ${color}15`,
            border: `1.5px solid ${color}60`,
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
      )}
    </div>
  );
});
