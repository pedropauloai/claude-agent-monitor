import type { AgentZone, AgentMapPosition } from '@claudecam/shared';
import { ZoneCard } from './ZoneCard';

const ZONE_ORDER: AgentZone[] = [
  'library', 'workshop', 'terminal', 'research',
  'comms',   'taskboard', 'rest',    'done',
];

interface AgentMapGridProps {
  positions: Map<string, AgentMapPosition>;
  agentNames: Map<string, string>;
  agentColors: Map<string, string>;
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
}

export function AgentMapGrid({
  positions,
  agentNames,
  agentColors,
  selectedAgentId,
  onSelectAgent,
}: AgentMapGridProps) {
  const agentsByZone = new Map<AgentZone, AgentMapPosition[]>();
  for (const zone of ZONE_ORDER) {
    agentsByZone.set(zone, []);
  }
  for (const pos of positions.values()) {
    const list = agentsByZone.get(pos.zone);
    if (list) {
      list.push(pos);
    }
  }

  return (
    <div className="agent-map-grid grid grid-cols-4 gap-2 p-3 h-full auto-rows-fr">
      {ZONE_ORDER.map((zone) => {
        const agents = agentsByZone.get(zone) ?? [];
        return (
          <ZoneCard key={zone} zone={zone} agentCount={agents.length}>
            {agents.map((pos) => {
              const name = agentNames.get(pos.agentId) ?? pos.agentId;
              const color = agentColors.get(pos.agentId) ?? '#8b5cf6';
              const initial = (name.charAt(0) || '?').toUpperCase();
              return (
                <div
                  key={pos.agentId}
                  className={`flex flex-col items-center gap-1.5 cursor-pointer transition-transform hover:scale-110 ${
                    selectedAgentId === pos.agentId ? 'drop-shadow-[0_0_8px_var(--agent-color)]' : ''
                  }`}
                  style={{ '--agent-color': color } as React.CSSProperties}
                  onClick={() => onSelectAgent(pos.agentId)}
                  title={`${name} (${pos.animationState})${pos.activityLabel ? ` - ${pos.activityLabel}` : ''}`}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${color}33` }}
                  >
                    <span className="text-sm font-bold font-mono" style={{ color }}>
                      {initial}
                    </span>
                  </div>
                  <span className="text-xs font-mono opacity-80" style={{ color }}>
                    {name}
                  </span>
                </div>
              );
            })}
          </ZoneCard>
        );
      })}
    </div>
  );
}
