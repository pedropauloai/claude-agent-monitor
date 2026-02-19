import { type ReactNode, memo } from 'react';
import type { AgentZone } from '@claudecam/shared';
import { ZONE_META } from '@claudecam/shared';
import { getZoneColor, getZoneIconPixel } from './zone-logic';

interface ZoneCardProps {
  zone: AgentZone;
  agentCount: number;
  children: ReactNode;
}

function ZoneCardInner({ zone, agentCount, children }: ZoneCardProps) {
  const meta = ZONE_META[zone];
  const colorClasses = getZoneColor(zone);
  const icon = getZoneIconPixel(zone);

  return (
    <div
      className={`agent-map-zone relative bg-gradient-to-br ${colorClasses} border rounded-lg p-3 min-h-[140px] flex flex-col`}
      data-zone={zone}
    >
      {/* Zone Header */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="agent-map-zone-icon text-xs font-mono opacity-60">{icon}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-cam-text-secondary">
            {meta.label}
          </span>
        </div>
        {agentCount > 0 && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-white/10 text-cam-text-muted">
            {agentCount}
          </span>
        )}
      </div>

      {/* Agents Container */}
      <div className="flex-1 flex flex-wrap gap-3 items-end content-end">
        {children}
      </div>

      {/* Empty state */}
      {agentCount === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[10px] text-cam-text-muted/40 italic">{meta.description}</span>
        </div>
      )}
    </div>
  );
}

export const ZoneCard = memo(ZoneCardInner, (prev, next) => {
  return prev.zone === next.zone && prev.agentCount === next.agentCount && prev.children === next.children;
});
