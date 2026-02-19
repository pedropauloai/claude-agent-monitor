import type { AgentMapPosition } from '@claudecam/shared';

interface ParentChildLinesProps {
  positions: Map<string, AgentMapPosition>;
  agentColors: Map<string, string>;
}

/**
 * SVG overlay that draws dotted lines connecting parent agents to their children.
 * Uses a subtle dotted style (different from InteractionLines which use dashed).
 * Lines go from parent (top) to child (below).
 */
export function ParentChildLines({ positions, agentColors }: ParentChildLinesProps) {
  const relationships = getParentChildPairs(positions);

  if (relationships.length === 0) return null;

  return (
    <svg className="hierarchy-lines-overlay" xmlns="http://www.w3.org/2000/svg">
      {relationships.map(({ parentId, childId }) => {
        const parentCoords = getHierarchyPosition(parentId, positions);
        const childCoords = getHierarchyPosition(childId, positions);
        const color = agentColors.get(parentId) ?? '#8b5cf6';

        // Calculate a control point for a subtle curved line
        const midY = (parentCoords.y + childCoords.y) / 2;

        return (
          <path
            key={`hierarchy-${parentId}-${childId}`}
            className="hierarchy-line"
            d={`M ${parentCoords.x}% ${parentCoords.y}% Q ${parentCoords.x}% ${midY}% ${childCoords.x}% ${childCoords.y}%`}
            fill="none"
            stroke={color}
            strokeWidth="1"
            opacity="0.3"
          />
        );
      })}
    </svg>
  );
}

/** Extract all parent-child pairs from positions map */
function getParentChildPairs(
  positions: Map<string, AgentMapPosition>
): Array<{ parentId: string; childId: string }> {
  const pairs: Array<{ parentId: string; childId: string }> = [];

  for (const [agentId, pos] of positions) {
    if (pos.parentAgentId && positions.has(pos.parentAgentId)) {
      pairs.push({ parentId: pos.parentAgentId, childId: agentId });
    }
  }

  return pairs;
}

/**
 * Approximate position of an agent in the hierarchy layout.
 * Root agents are positioned at the top, children below.
 * Uses the same approach as InteractionLines for consistency.
 */
function getHierarchyPosition(
  agentId: string,
  positions: Map<string, AgentMapPosition>
): { x: number; y: number } {
  // Build hierarchy tree
  const rootIds: string[] = [];
  const childrenMap = new Map<string, string[]>();
  const allActiveIds: string[] = [];
  const inactiveIds: string[] = [];

  for (const [id, pos] of positions) {
    const isInactive =
      pos.animationState === 'idle' ||
      pos.animationState === 'completed' ||
      pos.animationState === 'shutdown';

    if (isInactive) {
      inactiveIds.push(id);
      continue;
    }

    allActiveIds.push(id);

    if (!pos.parentAgentId || !positions.has(pos.parentAgentId)) {
      rootIds.push(id);
    } else {
      const siblings = childrenMap.get(pos.parentAgentId) ?? [];
      siblings.push(id);
      childrenMap.set(pos.parentAgentId, siblings);
    }
  }

  // Check if agent is inactive (in the bottom bar)
  const inactiveIdx = inactiveIds.indexOf(agentId);
  if (inactiveIdx >= 0) {
    const count = inactiveIds.length;
    const x = count === 1 ? 50 : 15 + (inactiveIdx / (count - 1)) * 70;
    return { x, y: 92 };
  }

  // Check if agent is a root
  const rootIdx = rootIds.indexOf(agentId);
  if (rootIdx >= 0) {
    const count = rootIds.length;
    const x = count === 1 ? 50 : 20 + (rootIdx / (count - 1)) * 60;
    return { x, y: 25 };
  }

  // Agent is a child - find its parent and position among siblings
  const pos = positions.get(agentId);
  if (pos?.parentAgentId) {
    const parentCoords = getHierarchyPosition(pos.parentAgentId, positions);
    const siblings = childrenMap.get(pos.parentAgentId) ?? [agentId];
    const sibIdx = siblings.indexOf(agentId);
    const sibCount = siblings.length;

    // Spread children horizontally around parent's x position
    const spreadWidth = Math.min(sibCount * 15, 60);
    const startX = parentCoords.x - spreadWidth / 2;
    const x = sibCount === 1 ? parentCoords.x : startX + (sibIdx / (sibCount - 1)) * spreadWidth;

    return { x: Math.max(5, Math.min(95, x)), y: 60 };
  }

  return { x: 50, y: 40 };
}
