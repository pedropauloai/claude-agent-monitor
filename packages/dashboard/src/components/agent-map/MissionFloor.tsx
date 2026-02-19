import { useMemo, useState, useEffect } from 'react';
import type { AgentMapPosition, AgentAnimationState, SpeechBubbleData } from '@claudecam/shared';
import type { ConnectionStatus } from '../../stores/session-store';
import { AgentCard } from './AgentCard';
import { SpeechBubble } from './SpeechBubble';
import { NexbotGuide } from '../agent-map-3d/NexbotGuide.js';

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
  hasProject: boolean;
  projectsLoaded: boolean;
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
 * Inline code styling for instruction text.
 */
function Code({ children }: { children: string }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-violet-300 text-[11px] font-mono">
      {children}
    </code>
  );
}

/**
 * EmptyFloor - Contextual empty state for the Agent Map.
 * Displays NEXBOT 3D robot with contextual instructions depending on
 * why no agents are visible. Each state has a professional onboarding feel.
 */
function EmptyFloor({
  sessionStatus,
  sessionStartedAt,
  connectionStatus,
  eventCount,
  totalAgentsEver,
  hasProject,
  projectsLoaded,
}: {
  sessionStatus: 'active' | 'completed' | 'error' | null;
  sessionStartedAt: string | null;
  connectionStatus: ConnectionStatus;
  eventCount: number;
  totalAgentsEver: number;
  hasProject: boolean;
  projectsLoaded: boolean;
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

  // Loading state: projects haven't been fetched yet
  if (!projectsLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-transparent rounded-full animate-spin" />
        <span className="text-zinc-600 text-xs font-mono">Loading...</span>
      </div>
    );
  }

  // Case 0: No project registered — Welcome onboarding
  if (!hasProject) {
    return (
      <NexbotGuide
        title="Welcome to CAM!"
        subtitle="Register your project to start monitoring your Claude Code agents in real-time."
        variant="default"
      >
        <div className="flex flex-col gap-2 mt-3 text-left">
          <Step n={1}>
            Run <Code>cam init</Code> in your project root
          </Step>
          <Step n={2}>
            Start Claude Code in the same directory
          </Step>
          <Step n={3}>
            Watch your agents appear here automatically
          </Step>
        </div>
      </NexbotGuide>
    );
  }

  // Case 1: No session selected — Project is ready
  if (sessionStatus === null) {
    return (
      <NexbotGuide
        title="Ready to Monitor"
        subtitle="Your project is registered. Start a Claude Code session to see agents here."
        variant="default"
      >
        <div className="flex flex-col gap-2 mt-3 text-left">
          <Step n={1}>
            Open a terminal in this project
          </Step>
          <Step n={2}>
            Run <Code>claude</Code> to start Claude Code
          </Step>
          <Step n={3}>
            Agents will appear here as they work
          </Step>
        </div>
        <p className="text-zinc-600 text-[10px] font-mono mt-3">
          Or select a previous session from the picker above
        </p>
      </NexbotGuide>
    );
  }

  // Case 2: SSE disconnected or reconnecting
  if (connectionStatus === 'disconnected' || connectionStatus === 'reconnecting') {
    return (
      <NexbotGuide
        title={connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Connection Lost'}
        subtitle="Trying to re-establish connection to the CAM server."
        variant="warning"
      >
        {connectionStatus === 'reconnecting' && (
          <div className="flex items-center gap-2 mt-2">
            <div className="w-4 h-4 border-2 border-amber-500/40 border-t-transparent rounded-full animate-spin" />
            <span className="text-amber-500/60 text-[10px] font-mono">
              Retrying automatically...
            </span>
          </div>
        )}
      </NexbotGuide>
    );
  }

  // Case 3: Session completed or errored
  if (sessionStatus === 'completed' || sessionStatus === 'error') {
    const startDate = sessionStartedAt ? new Date(sessionStartedAt) : null;
    const formattedStart = startDate
      ? startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null;

    return (
      <NexbotGuide
        title={sessionStatus === 'error' ? 'Session Ended with Errors' : 'Session Completed'}
        variant={sessionStatus === 'error' ? 'error' : 'success'}
      >
        <div className="flex flex-col items-center gap-1 mt-1">
          <span className="text-zinc-500 text-xs font-mono">
            {totalAgentsEver} agent{totalAgentsEver !== 1 ? 's' : ''} &middot; {eventCount} event{eventCount !== 1 ? 's' : ''}
          </span>
          {formattedStart && (
            <span className="text-zinc-600 text-[10px] font-mono">
              started at {formattedStart}
            </span>
          )}
        </div>
      </NexbotGuide>
    );
  }

  // Case 4: Session active, no agents yet
  return (
    <NexbotGuide
      title="Listening for Agents..."
      subtitle="Session is active. Waiting for agent activity."
      variant="pulse"
    >
      {/* Pulse radar animation below NEXBOT */}
      <div className="relative flex items-center justify-center w-8 h-8 mt-1">
        <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-emerald-500/20" />
        <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-emerald-500/30" style={{ animationDelay: '0.5s' }} />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500/60" />
      </div>
      <div className="flex flex-col items-center gap-1 mt-1">
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
    </NexbotGuide>
  );
}

/**
 * Numbered step indicator for onboarding instructions.
 */
function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold bg-violet-500/15 text-violet-400"
      >
        {n}
      </span>
      <span className="text-zinc-400 text-xs font-mono pt-0.5 leading-relaxed">
        {children}
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
  hasProject,
  projectsLoaded,
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
            hasProject={hasProject}
            projectsLoaded={projectsLoaded}
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
