import { useMemo } from 'react';
import { useProjectStore } from '../../../stores/project-store';

interface SectionSummary {
  name: string;
  total: number;
  completed: number;
  inProgress: number;
  blocked: number;
  percent: number;
}

export function PixelPRDOverview() {
  const { activeProject, tasks } = useProjectStore();

  const sections = useMemo((): SectionSummary[] => {
    if (!activeProject || tasks.length === 0) return [];

    const sectionMap = new Map<string, SectionSummary>();
    for (const task of tasks) {
      const sectionName = task.prdSection || 'Uncategorized';
      if (!sectionMap.has(sectionName)) {
        sectionMap.set(sectionName, {
          name: sectionName,
          total: 0,
          completed: 0,
          inProgress: 0,
          blocked: 0,
          percent: 0,
        });
      }
      const section = sectionMap.get(sectionName)!;
      section.total++;
      if (task.status === 'completed') section.completed++;
      if (task.status === 'in_progress') section.inProgress++;
      if (task.status === 'blocked') section.blocked++;
    }

    for (const section of sectionMap.values()) {
      section.percent = section.total > 0 ? Math.round((section.completed / section.total) * 100) : 0;
    }

    return Array.from(sectionMap.values());
  }, [activeProject, tasks]);

  if (sections.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <span className="pixel-text-xl">\📖</span>
          <p className="pixel-text-xs mt-2" style={{ color: 'var(--pixel-text-muted)' }}>
            QUEST JOURNAL
          </p>
          <p className="pixel-text-xs mt-1" style={{ color: 'var(--pixel-text-dim)' }}>
            NO ENTRIES YET
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="pixel-text-xs" style={{ color: 'var(--pixel-gold)' }}>
          \📖 QUEST JOURNAL
        </span>
        <span className="pixel-text-xs" style={{ color: 'var(--pixel-text-muted)' }}>
          {activeProject?.name}
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pixel-scrollbar pb-1">
        {sections.map((section) => {
          const isComplete = section.percent === 100;
          const isBlocked = section.blocked > 0;
          const isActive = section.inProgress > 0;

          let borderStyle = 'pixel-card';
          let statusText = '';
          let statusColor = 'var(--pixel-text-dim)';

          if (isComplete) {
            borderStyle = 'pixel-border-gold';
            statusText = 'CHAPTER CLEAR!';
            statusColor = 'var(--pixel-gold)';
          } else if (isBlocked) {
            borderStyle = 'pixel-glow-red';
            statusText = 'SEALED';
            statusColor = 'var(--pixel-error)';
          } else if (isActive) {
            borderStyle = 'pixel-glow-green';
            statusText = 'IN PROGRESS';
            statusColor = 'var(--pixel-green)';
          }

          return (
            <div
              key={section.name}
              className={`shrink-0 w-48 p-3 ${borderStyle}`}
              style={{ background: 'var(--pixel-bg-dark)' }}
            >
              {/* Section name */}
              <div className="flex items-center justify-between mb-2">
                <h4 className="pixel-text-xs truncate flex-1" style={{ color: 'var(--pixel-text)' }}>
                  {section.name}
                </h4>
                <span className="pixel-text-xs font-bold ml-2" style={{ color: 'var(--pixel-gold)' }}>
                  {section.percent}%
                </span>
              </div>

              {/* XP-style Progress Bar */}
              <div className="pixel-bar-container pixel-bar-xp mb-2" style={{ height: '10px' }}>
                <div
                  className="pixel-bar-fill"
                  style={{
                    width: `${section.percent}%`,
                    background: isComplete
                      ? 'var(--pixel-gold)'
                      : isBlocked
                        ? 'var(--pixel-error)'
                        : 'var(--pixel-xp)',
                  }}
                />
              </div>

              {/* Stats */}
              <div className="flex items-center gap-2 pixel-text-xs" style={{ color: 'var(--pixel-text-dim)' }}>
                <span>{section.completed}/{section.total}</span>
                {section.inProgress > 0 && (
                  <span style={{ color: 'var(--pixel-green)' }}>{section.inProgress}\u2694</span>
                )}
                {section.blocked > 0 && (
                  <span style={{ color: 'var(--pixel-error)' }}>{section.blocked}\🔒</span>
                )}
              </div>

              {/* Status label */}
              {statusText && (
                <div className={`mt-1 pixel-text-xs ${isComplete ? 'pixel-sparkle' : ''}`} style={{ color: statusColor }}>
                  {statusText}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
