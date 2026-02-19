import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr } from '@react-three/drei';
import { useRef, useEffect, useMemo } from 'react';
import type { Group, OrthographicCamera } from 'three';
import type { AgentPose } from '@claudecam/shared';
import {
  CodingIndicator,
  ReadingIndicator,
  TerminalIndicator,
  SearchingIndicator,
  TalkingIndicator,
  ManagingIndicator,
  CelebratingIndicator,
  ErrorIndicator,
} from './indicators/index.js';
import { PortalSpawn } from './PortalSpawn.js';

/* ------------------------------------------------------------------
 * R3FOverlay
 *
 * A transparent R3F Canvas overlay that renders 3D action indicators
 * above each agent card in the Mission Floor. Replaces the imperative
 * ThreeIndicatorOverlay (~870 lines) with declarative R3F components.
 *
 * Key design decisions:
 *  - Orthographic camera mapped to pixel coords (center = 0,0)
 *  - DOM element queries are cached and refreshed on a schedule
 *  - Each indicator is wrapped in PositionedIndicator which uses
 *    useFrame for imperative position updates (avoids React re-render
 *    dependency for smooth following)
 * ------------------------------------------------------------------ */

export interface IndicatorAgent {
  agentId: string;
  pose: AgentPose;
}

interface R3FOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  agents: IndicatorAgent[];
  zoom: number;
  spawningAgentIds: Set<string>;
}

/* --- Target position data shared via ref between scene and positioned indicators --- */

interface AgentPosition {
  x: number;
  y: number;
}

/* --- Pose-to-indicator mapping --- */

const ORIGIN: [number, number, number] = [0, 0, 0];

function IndicatorForPose({ pose }: { pose: AgentPose }) {
  switch (pose) {
    case 'coding':
      return <CodingIndicator position={ORIGIN} />;
    case 'reading':
      return <ReadingIndicator position={ORIGIN} />;
    case 'terminal':
      return <TerminalIndicator position={ORIGIN} />;
    case 'searching':
      return <SearchingIndicator position={ORIGIN} />;
    case 'talking':
      return <TalkingIndicator position={ORIGIN} />;
    case 'managing':
      return <ManagingIndicator position={ORIGIN} />;
    case 'celebrating':
      return <CelebratingIndicator position={ORIGIN} />;
    case 'idle':
      return null;
    default:
      return <ErrorIndicator position={ORIGIN} />;
  }
}

/* --- Wrapper that handles imperative position updates via useFrame --- */

function PositionedIndicator({
  agentId,
  pose,
  positionsRef,
  zoom,
}: {
  agentId: string;
  pose: AgentPose;
  positionsRef: React.RefObject<Map<string, AgentPosition>>;
  zoom: number;
}) {
  const groupRef = useRef<Group>(null);

  useFrame(() => {
    const group = groupRef.current;
    const pos = positionsRef.current?.get(agentId);
    if (!group) return;

    if (!pos) {
      group.visible = false;
      return;
    }

    group.visible = true;

    // Smooth follow — same interpolation as original ThreeIndicatorOverlay
    group.position.x += (pos.x - group.position.x) * 0.15;
    group.position.y += (pos.y - group.position.y) * 0.15;
    group.position.z = 0;

    // Scale with zoom
    const targetScale = zoom * 1.8;
    const ds = targetScale - group.scale.x;
    if (Math.abs(ds) > 0.001) {
      const ns = group.scale.x + ds * 0.2;
      group.scale.set(ns, ns, ns);
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <IndicatorForPose pose={pose} />
    </group>
  );
}

/* --- Wrapper for portal spawn with imperative position --- */

function PositionedPortal({
  agentId,
  positionsRef,
  color,
  onComplete,
}: {
  agentId: string;
  positionsRef: React.RefObject<Map<string, AgentPosition>>;
  color?: string;
  onComplete?: () => void;
}) {
  const groupRef = useRef<Group>(null);

  useFrame(() => {
    const group = groupRef.current;
    const pos = positionsRef.current?.get(agentId);
    if (!group || !pos) return;

    group.position.x = pos.x;
    group.position.y = pos.y;
    group.position.z = 0;
    group.visible = true;
  });

  return (
    <group ref={groupRef} visible={false}>
      <PortalSpawn position={ORIGIN} color={color} onComplete={onComplete} />
    </group>
  );
}

/* --- Inner scene component (lives inside the R3F Canvas) --- */

function IndicatorScene({
  containerRef,
  agents,
  zoom,
  spawningAgentIds,
}: R3FOverlayProps) {
  const { camera, size } = useThree();

  // Shared ref for target positions — updated in useFrame, read by PositionedIndicator
  const positionsRef = useRef<Map<string, AgentPosition>>(new Map());
  const elementCacheRef = useRef<Map<string, HTMLElement>>(new Map());
  const frameCountRef = useRef(0);

  // Sync orthographic camera frustum to container pixel dimensions
  useEffect(() => {
    const cam = camera as OrthographicCamera;
    cam.left = -size.width / 2;
    cam.right = size.width / 2;
    cam.top = size.height / 2;
    cam.bottom = -size.height / 2;
    cam.updateProjectionMatrix();
  }, [camera, size]);

  // Compute target positions from DOM each frame (with caching)
  useFrame(() => {
    const container = containerRef.current;
    if (!container || !container.isConnected) return;

    frameCountRef.current++;
    const frame = frameCountRef.current;

    // Rebuild element cache every 30 frames (~1s at 30fps)
    if (frame % 30 === 0 || elementCacheRef.current.size === 0) {
      elementCacheRef.current.clear();
      const els = container.querySelectorAll<HTMLElement>('[data-agent-id]');
      for (const el of els) {
        const id = el.dataset.agentId;
        if (id) elementCacheRef.current.set(id, el);
      }
    }

    // Refresh DOMRects every 2 frames to reduce reflow cost
    if (frame % 2 === 0) {
      const containerRect = container.getBoundingClientRect();
      const halfW = containerRect.width / 2;
      const halfH = containerRect.height / 2;

      for (const agent of agents) {
        if (agent.pose === 'idle') continue;

        let el = elementCacheRef.current.get(agent.agentId);
        if (!el || !el.isConnected) {
          // Fallback: single querySelector for this specific agent
          const found = container.querySelector<HTMLElement>(
            `[data-agent-id="${agent.agentId}"]`,
          );
          if (found) {
            el = found;
            elementCacheRef.current.set(agent.agentId, found);
          } else {
            continue;
          }
        }

        const agentRect = el.getBoundingClientRect();

        // Convert screen coords to Three.js orthographic coords
        // Screen origin = top-left; Three.js origin = center
        const cx = agentRect.left - containerRect.left + agentRect.width / 2;
        const topY = agentRect.top - containerRect.top;

        const threeX = cx - halfW;
        const threeY = halfH - topY + 30 * zoom; // Above the agent card

        positionsRef.current.set(agent.agentId, { x: threeX, y: threeY });
      }
    }
  });

  // Build active indicators (non-idle agents)
  const activeAgents = useMemo(
    () => agents.filter((a) => a.pose !== 'idle'),
    [agents],
  );

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[100, 200, 300]} intensity={0.8} />

      {/* Performance: adapt DPR based on GPU load */}
      <AdaptiveDpr pixelated />

      {/* Render an indicator for each active agent */}
      {activeAgents.map((agent) => (
        <PositionedIndicator
          key={agent.agentId}
          agentId={agent.agentId}
          pose={agent.pose}
          positionsRef={positionsRef}
          zoom={zoom}
        />
      ))}

      {/* Portal spawn effects for newly spawned sub-agents */}
      {activeAgents
        .filter((a) => spawningAgentIds.has(a.agentId))
        .map((agent) => (
          <PositionedPortal
            key={`spawn-${agent.agentId}`}
            agentId={agent.agentId}
            positionsRef={positionsRef}
          />
        ))}
    </>
  );
}

/* --- Main overlay component --- */

function R3FOverlay({
  containerRef,
  agents,
  zoom,
  spawningAgentIds,
}: R3FOverlayProps) {
  // Only render the Canvas when there are non-idle agents or spawning agents
  const hasActiveContent = useMemo(
    () =>
      agents.some((a) => a.pose !== 'idle') || spawningAgentIds.size > 0,
    [agents, spawningAgentIds],
  );

  if (!hasActiveContent) return null;

  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 500], zoom: 1 }}
      gl={{
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance',
      }}
      style={{
        pointerEvents: 'none',
        position: 'absolute',
        inset: '0',
        zIndex: 15,
      }}
      frameloop="always"
    >
      <IndicatorScene
        containerRef={containerRef}
        agents={agents}
        zoom={zoom}
        spawningAgentIds={spawningAgentIds}
      />
    </Canvas>
  );
}

export { R3FOverlay };
