import { useMemo } from 'react';
import type { AgentMapPosition, AgentAnimationState, AgentPose } from '@claudecam/shared';
import { AGENT_SPACING } from './scene-constants.js';

/**
 * 3D layout information for a single agent.
 * Converts the 2D AgentMapPosition data into 3D world coordinates.
 */
export interface AgentLayout3D {
  agentId: string;
  position: [number, number, number];
  modelType: 'main' | 'sub';
  color: string;
  name: string;
  type: string;
  pose: AgentPose;
  animationState: AgentAnimationState;
  activityLabel: string | null;
  lastTool: string | null;
  parentAgentId: string | null;
}

/** Animation states considered "active" (agent is doing something) */
const ACTIVE_STATES: Set<AgentAnimationState> = new Set([
  'working',
  'moving',
  'talking',
  'error',
]);

/** Animation states considered "inactive" (agent is resting/done) */
const INACTIVE_STATES: Set<AgentAnimationState> = new Set([
  'idle',
  'shutdown',
  'completed',
]);

/** Poses that indicate active work */
const ACTIVE_POSES: Set<string> = new Set([
  'coding', 'reading', 'terminal', 'talking', 'searching', 'managing',
]);

/**
 * Determines if an agent is actively working.
 * Mirrors the logic from MissionFloor.tsx for consistency.
 */
function isAgentActive(position: AgentMapPosition): boolean {
  if (ACTIVE_STATES.has(position.animationState)) {
    return true;
  }
  if (INACTIVE_STATES.has(position.animationState)) {
    return false;
  }
  return ACTIVE_POSES.has(position.pose);
}

interface AgentMeta {
  name: string;
  type: string;
  color: string;
  status: string;
}

interface UseAgentLayoutInput {
  positions: Map<string, AgentMapPosition>;
  agentMeta: Map<string, AgentMeta>;
}

interface UseAgentLayoutResult {
  active: AgentLayout3D[];
  inactive: AgentLayout3D[];
}

/**
 * Hook that converts agent-map-store positions to 3D coordinates.
 *
 * Active agents are distributed in a row along the X axis.
 * Root agents sit at y=0, children are offset along the Z axis.
 * Inactive agents are returned separately for the InactiveBar3D.
 *
 * Model type: sub-agents (with parentAgentId) use the GENKUB model,
 * root agents use NEXBOT. If there is only 1 agent, always use NEXBOT.
 */
export function useAgentLayout({ positions, agentMeta }: UseAgentLayoutInput): UseAgentLayoutResult {
  return useMemo(() => {
    const active: AgentLayout3D[] = [];
    const inactive: AgentLayout3D[] = [];

    // Separate active vs inactive
    const activePositions: AgentMapPosition[] = [];
    const inactivePositions: AgentMapPosition[] = [];

    for (const position of positions.values()) {
      if (isAgentActive(position)) {
        activePositions.push(position);
      } else {
        inactivePositions.push(position);
      }
    }

    // Build hierarchy for active agents (same logic as MissionFloor)
    const activeSet = new Set(activePositions.map((a) => a.agentId));
    const childrenMap = new Map<string, AgentMapPosition[]>();
    const roots: AgentMapPosition[] = [];

    for (const agent of activePositions) {
      const parentId = agent.parentAgentId;
      if (!parentId || !activeSet.has(parentId)) {
        roots.push(agent);
      } else {
        const siblings = childrenMap.get(parentId) ?? [];
        siblings.push(agent);
        childrenMap.set(parentId, siblings);
      }
    }

    const totalAgents = activePositions.length;
    const onlyOneAgent = totalAgents <= 1;

    // Position root agents along the X axis, centered around 0
    const rootCount = roots.length;
    const totalWidth = (rootCount - 1) * AGENT_SPACING;
    const startX = -totalWidth / 2;

    for (let i = 0; i < rootCount; i++) {
      const root = roots[i];
      const meta = agentMeta.get(root.agentId);
      const x = rootCount === 1 ? 0 : startX + i * AGENT_SPACING;

      active.push({
        agentId: root.agentId,
        position: [x, 0, 0],
        modelType: 'main', // root agents always use NEXBOT
        color: meta?.color ?? '#8b5cf6',
        name: meta?.name ?? root.agentId,
        type: meta?.type ?? 'general-purpose',
        pose: root.pose,
        animationState: root.animationState,
        activityLabel: root.activityLabel,
        lastTool: root.lastTool,
        parentAgentId: root.parentAgentId,
      });

      // Position children of this root below (offset in Z and spread in X)
      const children = childrenMap.get(root.agentId) ?? [];
      const childSpacing = AGENT_SPACING * 0.8;
      const childTotalWidth = (children.length - 1) * childSpacing;
      const childStartX = x - childTotalWidth / 2;

      for (let j = 0; j < children.length; j++) {
        const child = children[j];
        const childMeta = agentMeta.get(child.agentId);
        const cx = children.length === 1 ? x : childStartX + j * childSpacing;

        active.push({
          agentId: child.agentId,
          position: [cx, 0, 3], // offset forward in Z
          modelType: onlyOneAgent ? 'main' : 'sub',
          color: childMeta?.color ?? '#8b5cf6',
          name: childMeta?.name ?? child.agentId,
          type: childMeta?.type ?? 'general-purpose',
          pose: child.pose,
          animationState: child.animationState,
          activityLabel: child.activityLabel,
          lastTool: child.lastTool,
          parentAgentId: child.parentAgentId,
        });
      }
    }

    // Inactive agents (these will be rendered as HTML outside the canvas)
    for (const pos of inactivePositions) {
      const meta = agentMeta.get(pos.agentId);
      inactive.push({
        agentId: pos.agentId,
        position: [0, 0, 0], // not used for inactive (rendered in HTML)
        modelType: pos.parentAgentId ? 'sub' : 'main',
        color: meta?.color ?? '#8b5cf6',
        name: meta?.name ?? pos.agentId,
        type: meta?.type ?? 'general-purpose',
        pose: pos.pose,
        animationState: pos.animationState,
        activityLabel: pos.activityLabel,
        lastTool: pos.lastTool,
        parentAgentId: pos.parentAgentId,
      });
    }

    return { active, inactive };
  }, [positions, agentMeta]);
}
