import { useMemo, useState, useEffect } from 'react';
import type { AgentMapPosition, AgentAnimationState, SpeechBubbleData } from '@claudecam/shared';
import type { ConnectionStatus } from '../../stores/session-store';
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
  sessionStatus: 'active' | 'completed' | 'error' | null;
  sessionStartedAt: string | null;
  connectionStatus: ConnectionStatus;
  eventCount: number;
  totalAgentsEver: number;
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
 * Formats elapsed seconds into a human-readable string like "2m 15s" or "1h 03m".
 */
function formatElapsed(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) {
    return `${mins}m ${String(secs).padStart(2, '0')}s`;
  }
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${String(remainMins).padStart(2, '0')}m`;
}

/**
 * EmptyFloor - Contextual empty state for the Agent Map.
 * Displays different messages depending on why no agents are visible.
 */
function EmptyFloor({
  sessionStatus,
  sessionStartedAt,
  connectionStatus,
  eventCount,
  totalAgentsEver,
}: {
  sessionStatus: 'active' | 'completed' | 'error' | null;
  sessionStartedAt: string | null;
  connectionStatus: ConnectionStatus;
  eventCount: number;
  totalAgentsEver: number;
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Elapsed timer for active sessions
  useEffect(() => {
    if (sessionStatus !== 'active' || !sessionStartedAt) {
      setElapsedSeconds(0);
      return;
    }

    const calcElapsed = () => {
      const start = new Date(sessionStartedAt).getTime();
      const now = Date.now();
      return Math.max(0, Math.floor((now - start) / 1000));
    };

    setElapsedSeconds(calcElapsed());
    const interval = setInterval(() => {
      setElapsedSeconds(calcElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStatus, sessionStartedAt]);

  // Case 1: No session selected
  if (sessionStatus === null) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        {/* Radar / monitor icon */}
        <svg
          className="w-10 h-10 text-zinc-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.348 14.652a3.75 3.75 0 010-5.304m5.304 0a3.75 3.75 0 010 5.304m-7.425 2.121a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
          />
        </svg>
        <span className="text-zinc-600 text-sm font-mono">
          Select a session to view agents
        </span>
      </div>
    );
  }

  // Case 2: SSE disconnected or reconnecting
  if (connectionStatus === 'disconnected' || connectionStatus === 'reconnecting') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        {/* Warning icon */}
        <svg
          className="w-10 h-10 text-amber-500/70"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        {connectionStatus === 'reconnecting' ? (
          <div className="flex items-center gap-2">
            <span className="animate-pulse text-amber-400 text-sm font-mono">
              Reconnecting...
            </span>
          </div>
        ) : (
          <span className="text-amber-500/80 text-sm font-mono">
            Connection lost
          </span>
        )}
      </div>
    );
  }

  // Case 3: Session completed or errored
  if (sessionStatus === 'completed' || sessionStatus === 'error') {
    const startDate = sessionStartedAt ? new Date(sessionStartedAt) : null;
    const formattedStart = startDate
      ? startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null;

    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 opacity-70">
        {/* Checkmark or error icon */}
        <svg
          className={`w-10 h-10 ${sessionStatus === 'error' ? 'text-red-500/60' : 'text-zinc-600'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          {sessionStatus === 'error' ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          )}
        </svg>
        <span className="text-zinc-500 text-sm font-mono">
          {sessionStatus === 'error' ? 'Session ended with errors' : 'Session ended'}
        </span>
        <div className="flex flex-col items-center gap-1">
          <span className="text-zinc-600 text-xs font-mono">
            {totalAgentsEver} agent{totalAgentsEver !== 1 ? 's' : ''}, {eventCount} event{eventCount !== 1 ? 's' : ''}
          </span>
          {formattedStart && (
            <span className="text-zinc-700 text-[10px] font-mono">
              started at {formattedStart}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Case 4: Session active, no agents yet
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      {/* Pulse radar animation */}
      <div className="relative flex items-center justify-center w-12 h-12">
        <span className="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-emerald-500/20" />
        <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-emerald-500/30" style={{ animationDelay: '0.5s' }} />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500/60" />
      </div>
      <span className="text-zinc-500 text-sm font-mono">
        Listening for agents...
      </span>
      <div className="flex flex-col items-center gap-1">
        {sessionStartedAt && (
          <span className="text-zinc-600 text-xs font-mono">
            {formatElapsed(elapsedSeconds)} elapsed
          </span>
        )}
        {eventCount > 0 && (
          <span className="text-zinc-600 text-xs font-mono">
            {eventCount} event{eventCount !== 1 ? 's' : ''} received
          </span>
        )}
      </div>
      <span className="text-zinc-700 text-[10px] font-mono mt-1">
        Run a Claude Code command to see agents here
      </span>
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
  sessionStatus,
  sessionStartedAt,
  connectionStatus,
  eventCount,
  totalAgentsEver,
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
          <EmptyFloor
            sessionStatus={sessionStatus}
            sessionStartedAt={sessionStartedAt}
            connectionStatus={connectionStatus}
            eventCount={eventCount}
            totalAgentsEver={totalAgentsEver}
          />
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
