import { useMemo, useState } from 'react';
import { useProjectStore } from '../../../stores/project-store';
import type { PRDTask, Sprint } from '@claudecam/shared';

const QUEST_STATUS_ICONS: Record<string, { icon: string; color: string }> = {
  backlog: { icon: '\u25CB', color: 'var(--pixel-text-dim)' },
  planned: { icon: '\u25CB', color: 'var(--pixel-blue)' },
  pending: { icon: '\u25CB', color: 'var(--pixel-blue)' },
  in_progress: { icon: '\u2694', color: 'var(--pixel-green)' },
  in_review: { icon: '\u25C6', color: 'var(--pixel-purple)' },
  completed: { icon: '\u2713', color: 'var(--pixel-gold)' },
  blocked: { icon: '\u2716', color: 'var(--pixel-error)' },
  deferred: { icon: '\u25CB', color: 'var(--pixel-text-dim)' },
};

interface SectionSummary {
  name: string;
  total: number;
  completed: number;
  inProgress: number;
  blocked: number;
  percent: number;
  tasks: PRDTask[];
  order: number;
}

interface SprintGroup {
  sprint: Sprint;
  sections: SectionSummary[];
  total: number;
  completed: number;
  percent: number;
}

export function PixelPRDOverview() {
  const { activeProject, tasks, sprints, selectTask } = useProjectStore();
  const [expandedSprint, setExpandedSprint] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const sprintGroups = useMemo((): SprintGroup[] => {
    if (!activeProject || tasks.length === 0 || sprints.length === 0) return [];

    const sprintMap = new Map<string, Sprint>();
    for (const s of sprints) sprintMap.set(s.id, s);

    const groupMap = new Map<string, Map<string, SectionSummary>>();
    for (const task of tasks) {
      const sprintId = task.sprintId || 'unknown';
      if (!groupMap.has(sprintId)) groupMap.set(sprintId, new Map());
      const sectionMap = groupMap.get(sprintId)!;

      const sectionName = task.prdSection || 'Uncategorized';
      if (!sectionMap.has(sectionName)) {
        sectionMap.set(sectionName, {
          name: sectionName,
          total: 0,
          completed: 0,
          inProgress: 0,
          blocked: 0,
          percent: 0,
          tasks: [],
          order: task.prdLineStart ?? 999,
        });
      }
      const section = sectionMap.get(sectionName)!;
      section.total++;
      section.tasks.push(task);
      if (task.status === 'completed') section.completed++;
      if (task.status === 'in_progress') section.inProgress++;
      if (task.status === 'blocked') section.blocked++;
    }

    const result: SprintGroup[] = [];
    for (const [sprintId, sectionMap] of groupMap) {
      const sprint = sprintMap.get(sprintId);
      if (!sprint) continue;

      const sections = Array.from(sectionMap.values());
      for (const section of sections) {
        section.percent = section.total > 0 ? Math.round((section.completed / section.total) * 100) : 0;
      }
      sections.sort((a, b) => a.order - b.order);

      const total = sections.reduce((s, sec) => s + sec.total, 0);
      const completed = sections.reduce((s, sec) => s + sec.completed, 0);

      result.push({
        sprint,
        sections,
        total,
        completed,
        percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      });
    }

    result.sort((a, b) => (a.sprint.order ?? 0) - (b.sprint.order ?? 0));
    return result;
  }, [activeProject, tasks, sprints]);

  if (sprintGroups.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <span className="pixel-text-xl">{'\uD83D\uDCD6'}</span>
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
          {'\uD83D\uDCD6'} QUEST JOURNAL
        </span>
        <span className="pixel-text-xs" style={{ color: 'var(--pixel-text-muted)' }}>
          {activeProject?.name}
        </span>
      </div>

      <div className="space-y-1">
        {sprintGroups.map((group) => {
          const isSprintExpanded = expandedSprint === group.sprint.id;
          const isSprintComplete = group.percent === 100;

          return (
            <div key={group.sprint.id}>
              {/* Sprint header */}
              <div
                className={`p-2 cursor-pointer ${isSprintComplete ? 'pixel-border-gold' : 'pixel-card'}`}
                style={{ background: 'var(--pixel-bg-dark)' }}
                onClick={() => setExpandedSprint(isSprintExpanded ? null : group.sprint.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="pixel-text-xs" style={{ color: 'var(--pixel-text-dim)' }}>
                      {isSprintExpanded ? '\u25BC' : '\u25B6'}
                    </span>
                    <h4 className="pixel-text-xs truncate" style={{ color: 'var(--pixel-gold)', fontWeight: 'bold' }}>
                      {group.sprint.name}
                    </h4>
                  </div>
                  <span className="pixel-text-xs font-bold ml-2 shrink-0" style={{ color: isSprintComplete ? 'var(--pixel-gold)' : 'var(--pixel-text)' }}>
                    {group.percent}%
                  </span>
                </div>

                <div className="pixel-bar-container pixel-bar-xp" style={{ height: '8px' }}>
                  <div
                    className="pixel-bar-fill"
                    style={{
                      width: `${group.percent}%`,
                      background: isSprintComplete ? 'var(--pixel-gold)' : 'var(--pixel-xp)',
                    }}
                  />
                </div>

                <div className="flex items-center gap-2 pixel-text-xs mt-1" style={{ color: 'var(--pixel-text-dim)' }}>
                  <span>{group.completed}/{group.total}</span>
                </div>
              </div>

              {/* Sections inside sprint */}
              {isSprintExpanded && (
                <div
                  className="ml-2 space-y-0.5"
                  style={{ borderLeft: '2px solid var(--pixel-border)' }}
                >
                  {group.sections.map((section) => {
                    const sectionKey = `${group.sprint.id}:${section.name}`;
                    const isSectionExpanded = expandedSection === sectionKey;
                    const isComplete = section.percent === 100;
                    const isBlocked = section.blocked > 0;
                    const isActive = section.inProgress > 0;

                    let statusColor = 'var(--pixel-text-dim)';
                    if (isComplete) statusColor = 'var(--pixel-gold)';
                    else if (isBlocked) statusColor = 'var(--pixel-error)';
                    else if (isActive) statusColor = 'var(--pixel-green)';

                    return (
                      <div key={sectionKey}>
                        <div
                          className="p-2 cursor-pointer"
                          style={{ background: 'var(--pixel-bg-dark)' }}
                          onClick={() => setExpandedSection(isSectionExpanded ? null : sectionKey)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="pixel-text-xs" style={{ color: 'var(--pixel-text-dim)' }}>
                                {isSectionExpanded ? '\u25BC' : '\u25B6'}
                              </span>
                              <h4 className="pixel-text-xs truncate" style={{ color: 'var(--pixel-text)' }}>
                                {section.name}
                              </h4>
                            </div>
                            <span className="pixel-text-xs font-bold ml-2 shrink-0" style={{ color: statusColor }}>
                              {section.percent}%
                            </span>
                          </div>

                          <div className="pixel-bar-container pixel-bar-xp" style={{ height: '6px' }}>
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

                          <div className="flex items-center gap-2 pixel-text-xs mt-1" style={{ color: 'var(--pixel-text-dim)' }}>
                            <span>{section.completed}/{section.total}</span>
                            {section.inProgress > 0 && (
                              <span style={{ color: 'var(--pixel-green)' }}>{section.inProgress}{'\u2694'}</span>
                            )}
                            {section.blocked > 0 && (
                              <span style={{ color: 'var(--pixel-error)' }}>{section.blocked}{'\uD83D\uDD12'}</span>
                            )}
                          </div>
                        </div>

                        {/* Expanded task list */}
                        {isSectionExpanded && (
                          <div
                            className="ml-2"
                            style={{
                              borderLeft: '2px solid var(--pixel-border)',
                              background: 'var(--pixel-bg-dark)',
                            }}
                          >
                            {section.tasks.map((task) => {
                              const st = QUEST_STATUS_ICONS[task.status] || QUEST_STATUS_ICONS.backlog;
                              return (
                                <div
                                  key={task.id}
                                  onClick={() => selectTask(task.id)}
                                  className="cursor-pointer px-3 py-1 flex items-center gap-2 pixel-text-xs"
                                  style={{ borderBottom: '1px solid var(--pixel-border)' }}
                                >
                                  <span style={{ color: st.color }}>{st.icon}</span>
                                  <span className="truncate flex-1" style={{ color: 'var(--pixel-text)' }}>
                                    {task.title}
                                  </span>
                                  {task.assignedAgent && (
                                    <span style={{ color: 'var(--pixel-text-dim)' }}>@{task.assignedAgent}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
