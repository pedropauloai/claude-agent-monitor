import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { useSessionStore } from '../../stores/session-store.js';
import { useAgentMapStore } from '../../stores/agent-map-store.js';
import { useAgentMapSync } from '../../hooks/use-agent-map-sync.js';
import { getAgentPalette } from '@claudecam/shared';
import { getAgentDisplayName } from '../../lib/friendly-names.js';
import { AgentMapHeader } from '../agent-map/AgentMapHeader.js';
import { SplineAgent } from './SplineAgent.js';
import { AgentOverlay } from './AgentOverlay.js';
import { InactiveBar3D } from './InactiveBar3D.js';
import { ConnectionLines3D } from './ConnectionLines3D.js';
import { R3FOverlay } from './R3FOverlay.js';
import type { IndicatorAgent } from './R3FOverlay.js';
import { useAgentLayout, type AgentLayout3D } from './use-agent-layout.js';
import { useZoomPan } from './use-zoom-pan.js';
import { AGENT_CARD_SIZE, CARD_GAP, CARD_TOTAL_HEIGHT } from './scene-constants.js';
import type { SpeechBubbleData } from '@claudecam/shared';
import { SpeechBubble } from '../agent-map/SpeechBubble.js';
import { NexbotGuide } from './NexbotGuide.js';

// Reuse existing agent-map CSS for speech bubbles, tool trail, etc.
import '../agent-map/agent-map.css';

function WelcomeStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold bg-violet-500/20 text-violet-400">
        {n}
      </span>
      <span className="text-zinc-300 text-sm font-mono pt-0.5 leading-relaxed">
        {children}
      </span>
    </div>
  );
}

/**
 * Main 3D Agent Map — "Mission Floor" layout.
 *
 * Features:
 * - @splinetool/react-spline for 3D robot rendering
 * - R3F overlay for 3D action indicators above each agent
 * - Zoom (mouse wheel toward cursor, transformOrigin: '0 0')
 * - Pan (click+drag on empty space, or middle-click drag)
 * - Drag & drop to reposition agents
 * - SVG connection lines for hierarchy + communication
 */
export function AgentMap3D() {
  // Sync server data to the agent-map store
  useAgentMapSync();

  // Refs — callback ref pattern so useZoomPan re-attaches when the element mounts
  const missionFloorRef = useRef<HTMLDivElement>(null);
  const [missionFloorEl, setMissionFloorEl] = useState<HTMLDivElement | null>(null);
  const missionFloorCallbackRef = useCallback((node: HTMLDivElement | null) => {
    missionFloorRef.current = node;
    setMissionFloorEl(node);
  }, []);

  // Session store data
  const session = useSessionStore((s) => s.session);
  const agents = useSessionStore((s) => s.agents);
  const selectedAgentId = useSessionStore((s) => s.selectedAgentId);
  const selectAgent = useSessionStore((s) => s.selectAgent);

  // Agent map store data
  const {
    positions,
    speechBubbles,
    interactionLines,
    showLabels,
    showInteractions,
  } = useAgentMapStore();

  // Zoom & Pan (wheel + background drag handled internally via native listeners)
  const {
    zoom,
    transformStyle,
    isPanning,
    handleMouseDown: handleZoomPanMouseDown,
    reset: resetZoomPan,
  } = useZoomPan(missionFloorEl);

  // Drag & drop state — use refs for values needed in global handlers to avoid stale closures
  const [dragAgentId, setDragAgentId] = useState<string | null>(null);
  const [customPositions, setCustomPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const dragRef = useRef<{
    agentId: string | null;
    mouseX: number;
    mouseY: number;
    agentX: number;
    agentY: number;
  }>({ agentId: null, mouseX: 0, mouseY: 0, agentX: 0, agentY: 0 });
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // Build agent metadata maps
  const agentNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const agent of agents) {
      map.set(agent.id, getAgentDisplayName(agent.id, agent.name || agent.id, agent.type ?? undefined));
    }
    return map;
  }, [agents]);

  const agentColors = useMemo(() => {
    const map = new Map<string, string>();
    for (const agent of agents) {
      const palette = getAgentPalette(agent.name || agent.id);
      map.set(agent.id, palette.primary);
    }
    return map;
  }, [agents]);

  const agentTypes = useMemo(() => {
    const map = new Map<string, string>();
    for (const agent of agents) {
      map.set(agent.id, agent.type);
    }
    return map;
  }, [agents]);

  const agentMeta = useMemo(() => {
    const map = new Map<string, { name: string; type: string; color: string; status: string }>();
    for (const agent of agents) {
      map.set(agent.id, {
        name: agentNames.get(agent.id) ?? agent.id,
        type: agentTypes.get(agent.id) ?? 'general-purpose',
        color: agentColors.get(agent.id) ?? '#8b5cf6',
        status: agent.status,
      });
    }
    return map;
  }, [agents, agentNames, agentTypes, agentColors]);

  // Split agents into active (mission floor) vs inactive (bottom bar)
  const { active, inactive } = useAgentLayout({ positions, agentMeta });

  // Group speech bubbles by agent
  const bubblesByAgent = useMemo(() => {
    const map = new Map<string, SpeechBubbleData[]>();
    for (const bubble of speechBubbles) {
      const existing = map.get(bubble.fromAgentId) ?? [];
      existing.push(bubble);
      map.set(bubble.fromAgentId, existing);
    }
    return map;
  }, [speechBubbles]);

  const handleSelectAgent = useCallback(
    (agentId: string) => {
      selectAgent(selectedAgentId === agentId ? null : agentId);
    },
    [selectAgent, selectedAgentId],
  );

  // Always show at least the main Claude agent
  const displayAgents: AgentLayout3D[] = active.length > 0
    ? active
    : [{
        agentId: 'claude-main',
        position: [0, 0, 0],
        modelType: 'main' as const,
        color: '#8b5cf6',
        name: 'Claude',
        type: 'general-purpose',
        pose: 'idle' as const,
        animationState: 'idle' as const,
        activityLabel: null,
        lastTool: null,
        parentAgentId: null,
      }];

  // Stable agent ID string for memo dependency (avoids .map().join() on every render)
  const agentIdKey = useMemo(
    () => displayAgents.map((a) => a.agentId).join(','),
    [displayAgents],
  );

  // --- Compute default grid positions ---
  const [containerSize, setContainerSize] = useState({ w: 1200, h: 600 });

  const defaultPositions = useMemo(() => {
    const { w: cw, h: ch } = containerSize;
    const count = displayAgents.length;
    const totalW = count * AGENT_CARD_SIZE + (count - 1) * CARD_GAP;
    const startX = (cw - totalW) / 2;
    const y = (ch - CARD_TOTAL_HEIGHT) / 2;

    const map = new Map<string, { x: number; y: number }>();
    for (let i = 0; i < count; i++) {
      map.set(displayAgents[i].agentId, {
        x: Math.max(0, startX + i * (AGENT_CARD_SIZE + CARD_GAP)),
        y: Math.max(0, y),
      });
    }
    return map;
  }, [agentIdKey, containerSize, displayAgents]);

  // Recalculate on container resize
  useEffect(() => {
    if (!missionFloorEl) return;

    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setContainerSize({ w: width, h: height });
      }
    });
    obs.observe(missionFloorEl);
    return () => obs.disconnect();
  }, [missionFloorEl]);

  // Cleanup stale entries from customPositions when agents leave
  useEffect(() => {
    const currentIds = new Set(displayAgents.map((a) => a.agentId));
    setCustomPositions((prev) => {
      let changed = false;
      for (const id of prev.keys()) {
        if (!currentIds.has(id)) changed = true;
      }
      if (!changed) return prev;
      const next = new Map<string, { x: number; y: number }>();
      for (const [id, pos] of prev) {
        if (currentIds.has(id)) next.set(id, pos);
      }
      return next;
    });
  }, [agentIdKey, displayAgents]);

  // Get final position for an agent (custom overrides default)
  const getAgentPos = useCallback(
    (agentId: string) => {
      return customPositions.get(agentId) ?? defaultPositions.get(agentId) ?? { x: 0, y: 0 };
    },
    [customPositions, defaultPositions],
  );

  // --- Agent drag & drop ---
  const handleAgentMouseDown = useCallback(
    (agentId: string, e: React.MouseEvent) => {
      if (e.button !== 0) return; // left-click only
      e.stopPropagation(); // don't trigger pan

      const pos = getAgentPos(agentId);
      dragRef.current = {
        agentId,
        mouseX: e.clientX,
        mouseY: e.clientY,
        agentX: pos.x,
        agentY: pos.y,
      };
      setDragAgentId(agentId);
    },
    [getAgentPos],
  );

  // --- Global mouse events for drag (uses refs to avoid stale closures) ---
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const drag = dragRef.current;
      if (!drag.agentId) return;

      const z = zoomRef.current;
      const dx = (e.clientX - drag.mouseX) / z;
      const dy = (e.clientY - drag.mouseY) / z;

      setCustomPositions((prev) => {
        const next = new Map(prev);
        next.set(drag.agentId!, {
          x: drag.agentX + dx,
          y: drag.agentY + dy,
        });
        return next;
      });
    }

    function onMouseUp() {
      if (dragRef.current.agentId) {
        dragRef.current.agentId = null;
        setDragAgentId(null);
      }
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []); // No deps — uses only refs

  // --- Build indicator data for R3F overlay ---
  const indicatorAgents: IndicatorAgent[] = useMemo(
    () => displayAgents.map((a) => ({ agentId: a.agentId, pose: a.pose })),
    [displayAgents],
  );

  // --- Spawn state tracking (detect new agents for portal animation) ---
  const prevAgentIdsRef = useRef<Set<string>>(new Set());
  const [spawningAgentIds, setSpawningAgentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(displayAgents.map((a) => a.agentId));
    const prevIds = prevAgentIdsRef.current;

    // Find newly added agents (not present in previous set)
    const newIds = new Set<string>();
    for (const id of currentIds) {
      if (!prevIds.has(id)) newIds.add(id);
    }

    prevAgentIdsRef.current = currentIds;

    if (newIds.size > 0) {
      setSpawningAgentIds(newIds);
      // Clear spawning state after animation duration (1.5s)
      const timer = setTimeout(() => setSpawningAgentIds(new Set()), 1500);
      return () => clearTimeout(timer);
    }
  }, [agentIdKey, displayAgents]);

  // --- Double-click reset (only on empty space, not on agents) ---
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const isOnAgent = (e.target as HTMLElement).closest('[data-agent-id]');
    if (!isOnAgent) resetZoomPan();
  }, [resetZoomPan]);

  // Cursor style
  const cursor = dragAgentId ? 'grabbing' : isPanning ? 'grabbing' : 'default';

  // Empty state: no session yet — show welcome screen with NEXBOT
  if (!session) {
    return (
      <div className="flex flex-col h-full overflow-hidden relative">
        <AgentMapHeader />
        <div
          className="flex-1 relative overflow-hidden"
          style={{ background: 'radial-gradient(ellipse at center, #0f0f1a 0%, #0a0a12 70%)' }}
        >
          <NexbotGuide
            title="Welcome to CAM!"
            subtitle="Start a Claude Code session to see your agents here in real-time."
            variant="default"
          >
            <div className="flex flex-col gap-2.5 mt-3 text-left">
              <WelcomeStep n={1}>Open a terminal in this project</WelcomeStep>
              <WelcomeStep n={2}>Run <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-violet-300 text-xs font-mono">claude</code> to start Claude Code</WelcomeStep>
              <WelcomeStep n={3}>Agents will appear here as they work</WelcomeStep>
            </div>
            <p className="text-zinc-500 text-xs font-mono mt-3">
              Or select a previous session from the picker above
            </p>
          </NexbotGuide>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <AgentMapHeader />

      {/* Mission Floor */}
      <div
        ref={missionFloorCallbackRef}
        className="flex-1 relative overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse at center, #0f0f1a 0%, #0a0a12 70%)',
          minHeight: 0,
          cursor,
        }}
        onMouseDown={handleZoomPanMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        {/* Subtle CSS grid floor (scales with zoom) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: [
              'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)',
              'linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
            ].join(','),
            backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
          }}
        />

        {/* Zoomable + pannable content wrapper */}
        <div
          className="absolute inset-0"
          style={{
            transform: transformStyle,
            transformOrigin: '0 0',
            willChange: dragAgentId || isPanning ? 'transform' : 'auto',
          }}
        >
          {/* Agent cards (absolute positioning) */}
          {displayAgents.map((layout) => {
            const pos = getAgentPos(layout.agentId);
            const isDragging = dragAgentId === layout.agentId;
            const agentBubbles = bubblesByAgent.get(layout.agentId) ?? [];
            const latestBubble = agentBubbles.length > 0
              ? agentBubbles[agentBubbles.length - 1]
              : null;

            return (
              <div
                key={layout.agentId}
                data-agent-id={layout.agentId}
                className={`absolute flex flex-col items-center${spawningAgentIds.has(layout.agentId) ? ' cam-agent-spawning' : ''}`}
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  width: `${AGENT_CARD_SIZE}px`,
                  zIndex: isDragging ? 50 : 10,
                  cursor: isDragging ? 'grabbing' : 'grab',
                  transition: isDragging ? 'none' : 'left 0.3s ease, top 0.3s ease',
                  userSelect: 'none',
                }}
                onMouseDown={(e) => handleAgentMouseDown(layout.agentId, e)}
              >
                {/* Speech bubble ABOVE the robot */}
                {latestBubble && (
                  <div className="mb-2 max-w-[280px]">
                    <SpeechBubble
                      key={latestBubble.id}
                      bubble={latestBubble}
                      color={layout.color}
                    />
                  </div>
                )}

                <SplineAgent
                  modelType={layout.modelType}
                  isSelected={selectedAgentId === layout.agentId}
                  isDragging={dragAgentId === layout.agentId}
                  onClick={() => handleSelectAgent(layout.agentId)}
                  color={layout.color}
                  pose={layout.pose}
                  animationState={layout.animationState}
                />

                <AgentOverlay
                  agentId={layout.agentId}
                  name={layout.name}
                  color={layout.color}
                  activityLabel={layout.activityLabel}
                  speechBubbles={agentBubbles}
                  showLabels={showLabels}
                  hideBubble
                />
              </div>
            );
          })}
        </div>

        {/* R3F 3D action indicators overlay */}
        <R3FOverlay
          containerRef={missionFloorRef}
          agents={indicatorAgents}
          zoom={zoom}
          spawningAgentIds={spawningAgentIds}
        />

        {/* SVG overlay for hierarchy + communication lines */}
        <ConnectionLines3D
          containerRef={missionFloorRef}
          interactionLines={interactionLines}
          positions={positions}
          agentColors={agentColors}
          showInteractions={showInteractions}
        />

        {/* Zoom indicator */}
        {zoom !== 1 && (
          <div className="absolute bottom-3 right-3 z-30 text-xs font-mono text-zinc-500 bg-black/50 px-2 py-1 rounded select-none pointer-events-none">
            {Math.round(zoom * 100)}%
          </div>
        )}
      </div>

      {/* Inactive agents bar */}
      <InactiveBar3D
        agents={inactive}
        selectedAgentId={selectedAgentId}
        onSelectAgent={handleSelectAgent}
      />
    </div>
  );
}
