import { useMemo } from 'react';
import type { InteractionLineData, AgentMapPosition } from '@claudecam/shared';

interface InteractionLinesProps {
  lines: InteractionLineData[];
  positions: Map<string, AgentMapPosition>;
  agentColors: Map<string, string>;
}

/** Line style configuration per interaction type */
interface LineStyle {
  strokeDasharray: string;
  className: string;
  strokeWidth: number;
  packetColor: string;
  packetRadius: number;
  animationDuration: string;
}

function getLineStyle(type: InteractionLineData['type'], color: string): LineStyle {
  switch (type) {
    case 'message':
      return {
        strokeDasharray: '8 4',
        className: 'interaction-line',
        strokeWidth: 1.5,
        packetColor: color,
        packetRadius: 3,
        animationDuration: '1.2s',
      };
    case 'spawn':
      return {
        strokeDasharray: 'none',
        className: 'interaction-line-spawn',
        strokeWidth: 2.5,
        packetColor: '#10b981',
        packetRadius: 4,
        animationDuration: '0.8s',
      };
    case 'task_assign':
      return {
        strokeDasharray: '3 5',
        className: 'interaction-line-task',
        strokeWidth: 1.5,
        packetColor: '#10b981',
        packetRadius: 2.5,
        animationDuration: '1.5s',
      };
  }
}

/**
 * SVG overlay that draws animated lines between communicating agents.
 *
 * Features:
 * - Animated "packet" dots travel along lines (SVG animateMotion)
 * - Different visual styles per interaction type (message, spawn, task_assign)
 * - Arrowhead markers at line endpoints
 * - Lines fade out over their lifetime
 */
export function InteractionLines({ lines, positions, agentColors }: InteractionLinesProps) {
  if (lines.length === 0) return null;

  /** Unique marker IDs per color */
  const markerColors = useMemo(() => {
    const colors = new Set<string>();
    for (const line of lines) {
      const color = agentColors.get(line.fromAgentId) ?? '#8b5cf6';
      const strokeColor = line.type === 'message' ? color : '#10b981';
      colors.add(strokeColor);
    }
    return Array.from(colors);
  }, [lines, agentColors]);

  return (
    <svg
      className="interaction-lines-overlay"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        {/* Arrowhead markers - one per unique color */}
        {markerColors.map((color) => {
          const markerId = `arrowhead-${color.replace('#', '')}`;
          return (
            <marker
              key={markerId}
              id={markerId}
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <polygon
                points="0 0, 8 3, 0 6"
                fill={color}
                opacity="0.7"
              />
            </marker>
          );
        })}
      </defs>

      {lines.map((line) => {
        const fromPos = positions.get(line.fromAgentId);
        const toPos = positions.get(line.toAgentId);
        if (!fromPos || !toPos) return null;

        const fromCoords = getAgentApproxPosition(line.fromAgentId, positions);
        const toCoords = getAgentApproxPosition(line.toAgentId, positions);
        const agentColor = agentColors.get(line.fromAgentId) ?? '#8b5cf6';
        const strokeColor = line.type === 'message' ? agentColor : '#10b981';
        const style = getLineStyle(line.type, agentColor);
        const markerId = `arrowhead-${strokeColor.replace('#', '')}`;

        // Line age for fade calculation
        const ageMs = Date.now() - line.timestamp;
        const fadeOpacity = Math.max(0.1, 1 - (ageMs / 5000));

        return (
          <g key={line.id} className="interaction-line-fading" style={{ opacity: fadeOpacity }}>
            {/* Visible line with arrowhead */}
            <line
              className={style.className}
              x1={`${fromCoords.x}%`}
              y1={`${fromCoords.y}%`}
              x2={`${toCoords.x}%`}
              y2={`${toCoords.y}%`}
              stroke={strokeColor}
              strokeWidth={style.strokeWidth}
              opacity="0.6"
              strokeDasharray={style.strokeDasharray === 'none' ? undefined : style.strokeDasharray}
              markerEnd={`url(#${markerId})`}
            />

            {/* Traveling packet dot - animated via SVG <animate> on cx/cy */}
            <circle
              r={style.packetRadius}
              fill={style.packetColor}
              className="interaction-packet"
              style={{ '--packet-color': style.packetColor } as React.CSSProperties}
            >
              <animate
                attributeName="cx"
                from={`${fromCoords.x}%`}
                to={`${toCoords.x}%`}
                dur={style.animationDuration}
                repeatCount="indefinite"
              />
              <animate
                attributeName="cy"
                from={`${fromCoords.y}%`}
                to={`${toCoords.y}%`}
                dur={style.animationDuration}
                repeatCount="indefinite"
              />
            </circle>

            {/* Secondary smaller trailing packet for message type */}
            {line.type === 'message' && (
              <circle
                r={style.packetRadius * 0.6}
                fill={style.packetColor}
                opacity="0.5"
              >
                <animate
                  attributeName="cx"
                  from={`${fromCoords.x}%`}
                  to={`${toCoords.x}%`}
                  dur={style.animationDuration}
                  repeatCount="indefinite"
                  begin="0.3s"
                />
                <animate
                  attributeName="cy"
                  from={`${fromCoords.y}%`}
                  to={`${toCoords.y}%`}
                  dur={style.animationDuration}
                  repeatCount="indefinite"
                  begin="0.3s"
                />
              </circle>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Approximate position of an agent on the Mission Floor.
 * Active agents are spread horizontally in the top 75% of the container.
 * Inactive agents (idle/completed/shutdown) are in the bottom 15%.
 */
function getAgentApproxPosition(
  agentId: string,
  positions: Map<string, AgentMapPosition>
): { x: number; y: number } {
  const allIds = Array.from(positions.keys());
  const activeIds: string[] = [];
  const inactiveIds: string[] = [];

  for (const id of allIds) {
    const pos = positions.get(id);
    if (!pos) continue;
    const isInactive = pos.animationState === 'idle' ||
                       pos.animationState === 'completed' ||
                       pos.animationState === 'shutdown';
    if (isInactive) {
      inactiveIds.push(id);
    } else {
      activeIds.push(id);
    }
  }

  const activeIdx = activeIds.indexOf(agentId);
  if (activeIdx >= 0) {
    const count = activeIds.length;
    const x = count === 1 ? 50 : 15 + (activeIdx / (count - 1)) * 70;
    return { x, y: 40 };
  }

  const inactiveIdx = inactiveIds.indexOf(agentId);
  if (inactiveIdx >= 0) {
    const count = inactiveIds.length;
    const x = count === 1 ? 50 : 15 + (inactiveIdx / (count - 1)) * 70;
    return { x, y: 90 };
  }

  return { x: 50, y: 50 };
}
