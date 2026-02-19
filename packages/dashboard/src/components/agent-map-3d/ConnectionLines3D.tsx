import { useState, useEffect, useCallback, useRef, type RefObject } from 'react';
import type { InteractionLineData, AgentMapPosition } from '@claudecam/shared';

interface ConnectionLines3DProps {
  /** Ref to the container element (for coordinate conversion) */
  containerRef: RefObject<HTMLDivElement | null>;
  /** Active interaction lines from the agent-map store */
  interactionLines: InteractionLineData[];
  /** All agent positions (for extracting parent-child relationships) */
  positions: Map<string, AgentMapPosition>;
  /** Agent accent colors */
  agentColors: Map<string, string>;
  /** Whether interaction lines are visible (user toggle) */
  showInteractions: boolean;
}

/** Pixel coordinates of an agent's center, relative to the container */
interface ScreenPos {
  cx: number;
  cy: number;
}

/**
 * SVG overlay that renders animated connection lines between agents.
 *
 * Uses a RAF loop (~15 fps) to continuously track DOM positions via
 * getBoundingClientRect, keeping lines in sync with zoom, pan, and drag.
 *
 * Two line types:
 * 1. **Hierarchy lines** — subtle dotted curves from parent to child agents
 * 2. **Interaction lines** — animated dashed lines with traveling "packet" dots
 *    for message, spawn, and task_assign events
 */
export function ConnectionLines3D({
  containerRef,
  interactionLines,
  positions,
  agentColors,
  showInteractions,
}: ConnectionLines3DProps) {
  const [screenPos, setScreenPos] = useState<Map<string, ScreenPos>>(new Map());
  const [size, setSize] = useState({ w: 0, h: 0 });

  // PERF: Track previous positions to avoid re-renders when nothing moved
  const prevPosRef = useRef<Map<string, ScreenPos>>(new Map());
  const prevSizeRef = useRef({ w: 0, h: 0 });

  /** Read actual DOM positions of all agent cards within the container */
  const readPositions = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const cRect = container.getBoundingClientRect();
    const w = cRect.width;
    const h = cRect.height;

    const els = container.querySelectorAll<HTMLElement>('[data-agent-id]');
    const newMap = new Map<string, ScreenPos>();
    let changed = w !== prevSizeRef.current.w || h !== prevSizeRef.current.h;

    for (const el of els) {
      const id = el.dataset.agentId;
      if (!id) continue;
      const r = el.getBoundingClientRect();
      const cx = r.left - cRect.left + r.width / 2;
      const cy = r.top - cRect.top + r.height / 2;
      newMap.set(id, { cx, cy });

      if (!changed) {
        const old = prevPosRef.current.get(id);
        if (!old || Math.abs(old.cx - cx) > 1 || Math.abs(old.cy - cy) > 1) {
          changed = true;
        }
      }
    }

    if (!changed && newMap.size === prevPosRef.current.size) return;

    prevPosRef.current = newMap;
    prevSizeRef.current = { w, h };
    setSize({ w, h });
    setScreenPos(newMap);
  }, [containerRef]);

  // setInterval (~15 fps) to track positions through zoom, pan, and drag.
  // Uses setInterval instead of RAF to avoid competing with the R3F overlay's render loop.
  useEffect(() => {
    readPositions(); // Immediate first read
    const interval = setInterval(readPositions, 66); // ~15fps
    return () => clearInterval(interval);
  }, [readPositions]);

  if (size.w === 0 || size.h === 0) return null;

  // --- Build hierarchy pairs from parentAgentId ---
  const hierarchyPairs: Array<{ parentId: string; childId: string }> = [];
  for (const [agentId, pos] of positions) {
    if (pos.parentAgentId && positions.has(pos.parentAgentId)) {
      hierarchyPairs.push({ parentId: pos.parentAgentId, childId: agentId });
    }
  }

  const hasHierarchy = hierarchyPairs.length > 0;
  const hasInteractions = showInteractions && interactionLines.length > 0;

  if (!hasHierarchy && !hasInteractions) return null;

  // Collect unique colors for arrowhead markers
  const markerColorSet = new Set<string>();
  for (const line of interactionLines) {
    const c = agentColors.get(line.fromAgentId) ?? '#8b5cf6';
    markerColorSet.add(line.type === 'message' ? c : '#10b981');
  }

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 20 }}
      viewBox={`0 0 ${size.w} ${size.h}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Arrowhead markers — one per unique color */}
        {Array.from(markerColorSet).map((color) => (
          <marker
            key={color}
            id={`a3d-${color.replace('#', '')}`}
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <polygon points="0 0, 8 3, 0 6" fill={color} opacity="0.7" />
          </marker>
        ))}

        {/* Glow filter for spawn lines */}
        <filter id="spawn-glow-3d">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ====== Hierarchy Lines (parent → child) ====== */}
      {hierarchyPairs.map(({ parentId, childId }) => {
        const from = screenPos.get(parentId);
        const to = screenPos.get(childId);
        if (!from || !to) return null;

        const color = agentColors.get(parentId) ?? '#8b5cf6';
        const midY = (from.cy + to.cy) / 2;
        const d = `M ${from.cx} ${from.cy} Q ${from.cx} ${midY} ${to.cx} ${to.cy}`;

        return (
          <g key={`h-${parentId}-${childId}`}>
            {/* Static line */}
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              strokeDasharray="6 4"
              opacity="0.25"
            />
            {/* Animated dash flow overlay */}
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              strokeDasharray="6 4"
              opacity="0.15"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="-20"
                dur="2s"
                repeatCount="indefinite"
              />
            </path>
            {/* Small packet traveling along the hierarchy line */}
            <circle r="2" fill={color} opacity="0.5">
              <animateMotion path={d} dur="3s" repeatCount="indefinite" />
            </circle>
          </g>
        );
      })}

      {/* ====== Interaction Lines (communication) ====== */}
      {showInteractions && interactionLines.map((line) => {
        const from = screenPos.get(line.fromAgentId);
        const to = screenPos.get(line.toAgentId);
        if (!from || !to) return null;

        const agentColor = agentColors.get(line.fromAgentId) ?? '#8b5cf6';
        const strokeColor = line.type === 'message' ? agentColor : '#10b981';
        const markerId = `a3d-${strokeColor.replace('#', '')}`;
        const ageMs = Date.now() - line.timestamp;
        const fadeOpacity = Math.max(0.1, 1 - ageMs / 5000);

        // Style per type
        const isSpawn = line.type === 'spawn';
        const isTask = line.type === 'task_assign';
        const strokeWidth = isSpawn ? 2.5 : 1.5;
        const dashArray = isSpawn ? undefined : isTask ? '3 5' : '8 4';
        const packetR = isSpawn ? 4 : isTask ? 2.5 : 3;
        const animDur = isSpawn ? '0.8s' : isTask ? '1.5s' : '1.2s';

        // Path for animateMotion
        const pathD = `M ${from.cx} ${from.cy} L ${to.cx} ${to.cy}`;

        return (
          <g key={line.id} style={{ opacity: fadeOpacity }}>
            {/* Main line */}
            <line
              x1={from.cx} y1={from.cy}
              x2={to.cx} y2={to.cy}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              opacity="0.6"
              markerEnd={`url(#${markerId})`}
              filter={isSpawn ? 'url(#spawn-glow-3d)' : undefined}
            />

            {/* Traveling packet */}
            <circle r={packetR} fill={strokeColor} opacity="0.9">
              <animateMotion path={pathD} dur={animDur} repeatCount="indefinite" />
            </circle>

            {/* Secondary trailing packet (messages only) */}
            {line.type === 'message' && (
              <circle r={packetR * 0.6} fill={strokeColor} opacity="0.5">
                <animateMotion
                  path={pathD}
                  dur={animDur}
                  repeatCount="indefinite"
                  begin="0.3s"
                />
              </circle>
            )}

            {/* Glow trail for spawn */}
            {isSpawn && (
              <circle r={packetR * 1.5} fill={strokeColor} opacity="0.3">
                <animateMotion
                  path={pathD}
                  dur={animDur}
                  repeatCount="indefinite"
                  begin="0.1s"
                />
              </circle>
            )}
          </g>
        );
      })}
    </svg>
  );
}
