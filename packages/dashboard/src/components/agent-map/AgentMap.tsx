import { useMemo, useCallback } from "react";
import { useSessionStore } from "../../stores/session-store";
import { useAgentMapStore } from "../../stores/agent-map-store";
import { AgentMapHeader } from "./AgentMapHeader";
import { MissionFloor } from "./MissionFloor";
import { InteractionLines } from "./InteractionLines";
import { ParentChildLines } from "./ParentChildLines";
import { getAgentPalette } from "@cam/shared";
import { getAgentDisplayName } from "../../lib/friendly-names.js";
import "./agent-map.css";

export function AgentMap() {
  const agents = useSessionStore((s) => s.agents);
  const selectedAgentId = useSessionStore((s) => s.selectedAgentId);
  const selectAgent = useSessionStore((s) => s.selectAgent);
  const { positions, speechBubbles, interactionLines, showInteractions } =
    useAgentMapStore();

  const agentNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const agent of agents) {
      map.set(agent.id, getAgentDisplayName(agent.id, agent.name || agent.id));
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

  const agentLastActivity = useMemo(() => {
    const map = new Map<string, string>();
    for (const agent of agents) {
      map.set(agent.id, agent.lastActivityAt);
    }
    return map;
  }, [agents]);

  const agentStatuses = useMemo(() => {
    const map = new Map<string, string>();
    for (const agent of agents) {
      map.set(agent.id, agent.status);
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

  const hasHierarchy = useMemo(() => {
    for (const pos of positions.values()) {
      if (pos.parentAgentId) return true;
    }
    return false;
  }, [positions]);

  const handleSelectAgent = useCallback(
    (agentId: string) => {
      selectAgent(selectedAgentId === agentId ? null : agentId);
    },
    [selectAgent, selectedAgentId],
  );

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <AgentMapHeader />

      <div className="flex-1 overflow-visible relative">
        <MissionFloor
          positions={positions}
          agentNames={agentNames}
          agentColors={agentColors}
          agentTypes={agentTypes}
          agentLastActivity={agentLastActivity}
          agentStatuses={agentStatuses}
          speechBubbles={speechBubbles}
          selectedAgentId={selectedAgentId}
          onSelectAgent={handleSelectAgent}
        />

        {/* Parent-child hierarchy lines (subtle dotted) */}
        {hasHierarchy && (
          <ParentChildLines positions={positions} agentColors={agentColors} />
        )}

        {/* Communication interaction lines (dashed, more prominent) */}
        {showInteractions && (
          <InteractionLines
            lines={interactionLines}
            positions={positions}
            agentColors={agentColors}
          />
        )}
      </div>
    </div>
  );
}
