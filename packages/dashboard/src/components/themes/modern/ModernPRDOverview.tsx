import { useMemo, useState } from 'react';
import { useProjectStore } from '../../../stores/project-store';
import { getPriorityColor } from '../../../lib/formatters';
import type { PRDTask, Sprint } from '@claudecam/shared';

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

export function ModernPRDOverview() {
  const { activeProject, tasks, sprints, selectTask } = useProjectStore();
  const [expandedSprint, setExpandedSprint] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const sprintGroups = useMemo((): SprintGroup[] => {
    if (!activeProject || tasks.length === 0 || sprints.length === 0) return [];

    // Build a sprintId -> Sprint map
    const sprintMap = new Map<string, Sprint>();
    for (const s of sprints) sprintMap.set(s.id, s);

    // Group tasks by sprintId, then by prdSection
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

    // Build sprint groups sorted by sprint order
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
          <p className="text-xs text-cam-text-muted">PRD Overview</p>
          <p className="text-[10px] text-cam-text-muted mt-1">
            Import a PRD to see section progress
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-cam-text-muted font-medium">
          PRD Sections
        </span>
        <span className="text-[10px] text-cam-text-secondary">
          {activeProject?.name}
        </span>
      </div>

      {sprintGroups.map((group) => {
        const isSprintExpanded = expandedSprint === group.sprint.id;

        return (
          <div key={group.sprint.id} className="space-y-0.5">
            {/* Sprint header */}
            <button
              onClick={() => setExpandedSprint(isSprintExpanded ? null : group.sprint.id)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-md bg-cam-surface-2/50 hover:bg-cam-surface-2 transition-colors text-left"
            >
              <svg
                className={`w-3.5 h-3.5 text-cam-text-muted shrink-0 transition-transform duration-150 ${isSprintExpanded ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>

              <span className="text-[11px] font-semibold text-cam-text uppercase tracking-wide truncate flex-1">
                {group.sprint.name}
              </span>

              <div className="w-20 h-1.5 bg-cam-surface-3 rounded-full overflow-hidden shrink-0">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    group.percent === 100 ? 'bg-green-400' : 'bg-cam-accent'
                  }`}
                  style={{ width: `${group.percent}%` }}
                />
              </div>

              <span className="text-[9px] text-cam-text-muted font-mono shrink-0">
                {group.completed}/{group.total}
              </span>
            </button>

            {/* Sections inside sprint */}
            {isSprintExpanded && (
              <div className="pl-3 space-y-0.5">
                {group.sections.map((section) => {
                  const isSectionExpanded = expandedSection === `${group.sprint.id}:${section.name}`;
                  const sectionKey = `${group.sprint.id}:${section.name}`;

                  return (
                    <div key={sectionKey}>
                      <button
                        onClick={() => setExpandedSection(isSectionExpanded ? null : sectionKey)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-cam-surface-2 transition-colors text-left"
                      >
                        <svg
                          className={`w-3 h-3 text-cam-text-muted shrink-0 transition-transform duration-150 ${isSectionExpanded ? 'rotate-90' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>

                        <span className="text-[11px] font-medium text-cam-text truncate flex-1">
                          {section.name}
                        </span>

                        <div className="w-16 h-1 bg-cam-surface-3 rounded-full overflow-hidden shrink-0">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              section.percent === 100
                                ? 'bg-green-400'
                                : section.blocked > 0
                                  ? 'bg-red-400'
                                  : 'bg-cam-accent'
                            }`}
                            style={{ width: `${section.percent}%` }}
                          />
                        </div>

                        <span className="text-[9px] text-cam-text-muted font-mono shrink-0">
                          {section.completed}/{section.total}
                        </span>
                      </button>

                      {/* Task list */}
                      {isSectionExpanded && (
                        <div className="pl-5 space-y-0.5 pb-1">
                          {section.tasks.map((task) => {
                            const priorityStyle = getPriorityColor(task.priority);
                            const statusDot = getStatusDotColor(task.status);

                            return (
                              <button
                                key={task.id}
                                onClick={() => selectTask(task.id)}
                                className="w-full text-left flex items-center gap-2 px-2 py-1 rounded hover:bg-cam-surface-2 transition-colors group"
                              >
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} />
                                <span className="text-[10px] text-cam-text-secondary group-hover:text-cam-text truncate flex-1">
                                  {task.title}
                                </span>
                                <span className={`text-[8px] px-1 py-0.5 rounded border font-medium shrink-0 ${priorityStyle}`}>
                                  {task.priority}
                                </span>
                                {task.assignedAgent && (
                                  <span className="text-[8px] text-cam-text-muted shrink-0">
                                    @{task.assignedAgent}
                                  </span>
                                )}
                              </button>
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
  );
}

function getStatusDotColor(status: string): string {
  const colors: Record<string, string> = {
    backlog: 'bg-gray-500',
    planned: 'bg-blue-500',
    pending: 'bg-yellow-500',
    in_progress: 'bg-emerald-500',
    in_review: 'bg-purple-500',
    completed: 'bg-green-500',
    blocked: 'bg-red-500',
    deferred: 'bg-gray-500',
  };
  return colors[status] || 'bg-gray-500';
}
