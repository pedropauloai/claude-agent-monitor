import { useMemo } from 'react';
import type { AgentMapPosition, AgentAnimationState, SpeechBubbleData } from '@cam/shared';
import { AgentCard } from './AgentCard';
import { SpeechBubble } from './SpeechBubble';

interface MissionFloorProps {
  positions: Map<string, AgentMapPosition>;
  agentNames: Map<string, string>;
  agentColors: Map<string, string>;
  agentTypes: Map<string, string>;
  agentLastActivity: Map<string, string>;
  agentStatuses: Map<string, string>;
  speechBubbles: SpeechBubbleData[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
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

/**
 * Determines if an agent is actively working based on animation state and pose.
 * Agents with a non-idle pose (e.g. 'coding', 'terminal') are treated as active
 * even if their animationState hasn't been updated yet.
 */
const ACTIVE_POSES: Set<string> = new Set([
  'coding', 'reading', 'terminal', 'talking', 'searching', 'managing',
]);

function isAgentActive(position: AgentMapPosition): boolean {
  if (ACTIVE_STATES.has(position.animationState)) {
    return true;
  }
  if (INACTIVE_STATES.has(position.animationState)) {
    return false;
  }
  return ACTIVE_POSES.has(position.pose);
}

/** A tree node representing a root agent and its children */
interface HierarchyGroup {
  root: AgentMapPosition;
  children: AgentMapPosition[];
}

/**
 * Build a hierarchical grouping of active agents.
 * Root agents (no parent, or parent not found) are group leaders.
 * Children are grouped under their parent.
 * Orphan agents (with a parent that's inactive) become roots.
 */
function buildHierarchy(activeAgents: AgentMapPosition[]): HierarchyGroup[] {
  const activeSet = new Set(activeAgents.map((a) => a.agentId));
  const childrenMap = new Map<string, AgentMapPosition[]>();
  const roots: AgentMapPosition[] = [];

  for (const agent of activeAgents) {
    const parentId = agent.parentAgentId;
    // An agent is a root if it has no parent or its parent isn't in the active set
    if (!parentId || !activeSet.has(parentId)) {
      roots.push(agent);
    } else {
      const siblings = childrenMap.get(parentId) ?? [];
      siblings.push(agent);
      childrenMap.set(parentId, siblings);
    }
  }

  // Build groups: each root with its children
  const groups: HierarchyGroup[] = roots.map((root) => ({
    root,
    children: childrenMap.get(root.agentId) ?? [],
  }));

  return groups;
}

/**
 * Wrapper that renders an AgentCard with any active speech bubbles floating above it.
 */
function AgentCardWithBubble({
  pos,
  agentNames,
  agentColors,
  agentTypes,
  agentLastActivity,
  agentStatuses,
  speechBubbles,
  selectedAgentId,
  compact,
  onSelectAgent,
}: {
  pos: AgentMapPosition;
  agentNames: Map<string, string>;
  agentColors: Map<string, string>;
  agentTypes: Map<string, string>;
  agentLastActivity: Map<string, string>;
  agentStatuses: Map<string, string>;
  speechBubbles: SpeechBubbleData[];
  selectedAgentId: string | null;
  compact?: boolean;
  onSelectAgent: (agentId: string) => void;
}) {
  // Find speech bubbles FROM this agent (the speaker)
  const agentBubbles = speechBubbles.filter((b) => b.fromAgentId === pos.agentId);
  const color = agentColors.get(pos.agentId) ?? '#8b5cf6';

  return (
    <div style={{ position: 'relative' }}>
      {/* Speech bubble floating above - show the most recent one */}
      {agentBubbles.length > 0 && !compact && (
        <div className="speech-bubble-wrapper">
          <SpeechBubble
            key={agentBubbles[agentBubbles.length - 1].id}
            bubble={agentBubbles[agentBubbles.length - 1]}
            color={color}
          />
        </div>
      )}
      <AgentCard
        agentId={pos.agentId}
        name={agentNames.get(pos.agentId) ?? pos.agentId}
        agentType={agentTypes.get(pos.agentId) ?? null}
        color={color}
        animationState={pos.animationState}
        pose={pos.pose}
        activityLabel={pos.activityLabel}
        lastTool={pos.lastTool}
        lastActivityAt={agentLastActivity.get(pos.agentId) ?? null}
        agentStatus={agentStatuses.get(pos.agentId) ?? null}
        isSelected={selectedAgentId === pos.agentId}
        compact={compact}
        onClick={() => onSelectAgent(pos.agentId)}
      />
    </div>
  );
}

/**
 * MissionFloor - Open workspace layout for the Agent Map.
 *
 * Uses hierarchical grouping: root agents at the top with their children below.
 * - Top 80%: ActiveWorkspace with agents grouped by parent-child hierarchy
 * - Bottom 20%: InactiveBar with idle/completed/shutdown agents shown compactly
 */
export function MissionFloor({
  positions,
  agentNames,
  agentColors,
  agentTypes,
  agentLastActivity,
  agentStatuses,
  speechBubbles,
  selectedAgentId,
  onSelectAgent,
}: MissionFloorProps) {
  const { activeAgents, inactiveAgents } = useMemo(() => {
    const active: AgentMapPosition[] = [];
    const inactive: AgentMapPosition[] = [];

    for (const position of positions.values()) {
      if (isAgentActive(position)) {
        active.push(position);
      } else {
        inactive.push(position);
      }
    }

    return { activeAgents: active, inactiveAgents: inactive };
  }, [positions]);

  const hierarchyGroups = useMemo(
    () => buildHierarchy(activeAgents),
    [activeAgents]
  );

  // Check if there are any parent-child relationships at all
  const hasHierarchy = hierarchyGroups.some((g) => g.children.length > 0);

  return (
    <div className="mission-floor flex flex-col h-full w-full">
      {/* Active Workspace - top section */}
      <div
        className={`mission-floor-workspace ${
          inactiveAgents.length > 0 ? '' : 'h-full'
        }`}
      >
        {activeAgents.length > 0 ? (
          hasHierarchy ? (
            /* Hierarchical layout: groups of root + children */
            <div className="agent-hierarchy-container">
              {hierarchyGroups.map((group) => (
                <div key={group.root.agentId} className="agent-hierarchy-group">
                  {/* Root agent at the top of the group */}
                  <div className="agent-hierarchy-root">
                    <AgentCardWithBubble
                      pos={group.root}
                      agentNames={agentNames}
                      agentColors={agentColors}
                      agentTypes={agentTypes}
                      agentLastActivity={agentLastActivity}
                      agentStatuses={agentStatuses}
                      speechBubbles={speechBubbles}
                      selectedAgentId={selectedAgentId}
                      onSelectAgent={onSelectAgent}
                    />
                  </div>

                  {/* Children spread below */}
                  {group.children.length > 0 && (
                    <div className="agent-hierarchy-children">
                      {group.children.map((child) => (
                        <AgentCardWithBubble
                          key={child.agentId}
                          pos={child}
                          agentNames={agentNames}
                          agentColors={agentColors}
                          agentTypes={agentTypes}
                          agentLastActivity={agentLastActivity}
                          agentStatuses={agentStatuses}
                          speechBubbles={speechBubbles}
                          selectedAgentId={selectedAgentId}
                          onSelectAgent={onSelectAgent}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Flat layout when no hierarchy detected (original behavior) */
            <div className="flex flex-wrap gap-4 items-start justify-center content-start h-full">
              {activeAgents.map((pos) => (
                <AgentCardWithBubble
                  key={pos.agentId}
                  pos={pos}
                  agentNames={agentNames}
                  agentColors={agentColors}
                  agentTypes={agentTypes}
                  agentLastActivity={agentLastActivity}
                  agentStatuses={agentStatuses}
                  speechBubbles={speechBubbles}
                  selectedAgentId={selectedAgentId}
                  onSelectAgent={onSelectAgent}
                />
              ))}
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-600 text-sm font-mono">
            <span>Waiting for agent activity...</span>
          </div>
        )}
      </div>

      {/* Inactive Bar - bottom section, only shown when there are inactive agents */}
      {inactiveAgents.length > 0 && (
        <div className="mission-floor-inactive border-t border-zinc-800/60 bg-zinc-950/40 px-4 py-2 shrink-0">
          <div className="flex items-center gap-3">
            {/* Inactive count label */}
            <span className="text-zinc-600 text-xs font-mono whitespace-nowrap shrink-0">
              {inactiveAgents.length === 1
                ? '1 inactive'
                : `${inactiveAgents.length} inactive`}
            </span>

            {/* Compact agent cards in a horizontal row */}
            <div className="flex flex-wrap gap-2 items-center overflow-x-auto">
              {inactiveAgents.map((pos) => (
                <AgentCardWithBubble
                  key={pos.agentId}
                  pos={pos}
                  agentNames={agentNames}
                  agentColors={agentColors}
                  agentTypes={agentTypes}
                  agentLastActivity={agentLastActivity}
                  agentStatuses={agentStatuses}
                  speechBubbles={speechBubbles}
                  selectedAgentId={selectedAgentId}
                  compact
                  onSelectAgent={onSelectAgent}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
