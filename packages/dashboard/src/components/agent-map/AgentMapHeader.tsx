import { useAgentMapStore } from '../../stores/agent-map-store';

export function AgentMapHeader() {
  const positions = useAgentMapStore((s) => s.positions);
  const agentCount = positions.size;

  return (
    <div className="agent-map-header">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-cam-text tracking-tight">Agent Map</span>
        <span className="text-[10px] text-cam-text-muted font-mono">
          {agentCount} agent{agentCount !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}
