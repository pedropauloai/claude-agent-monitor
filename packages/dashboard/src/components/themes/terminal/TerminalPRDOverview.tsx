import { useMemo, useState } from 'react';
import { useProjectStore } from '../../../stores/project-store';
import type { PRDTask, Sprint } from '@claudecam/shared';

const STATUS_CHARS: Record<string, { char: string; color: string }> = {
  backlog: { char: '.', color: 'terminal-dim' },
  planned: { char: '-', color: 'text-[#00ccff]' },
  pending: { char: '-', color: 'text-[#00ccff]' },
  in_progress: { char: '*', color: 'text-[#00ff00]' },
  in_review: { char: '?', color: 'terminal-muted' },
  completed: { char: '+', color: 'text-[#00ff00]' },
  blocked: { char: '!', color: 'terminal-error' },
  deferred: { char: '.', color: 'terminal-dim' },
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

function miniBar(percent: number, width: number = 12): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
}

export function TerminalPRDOverview() {
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
      <div className="h-full flex items-center justify-center font-mono text-[11px]">
        <div className="terminal-dim text-center">
          <p>{'## SPRINT OVERVIEW ##'}</p>
          <p className="mt-1">{'> Import a sprint to see section progress'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 font-mono text-[11px]">
      <div className="flex items-center justify-between mb-2">
        <span className="terminal-muted">{'## SPRINT SECTIONS ##'}</span>
        <span className="text-[#00ccff] text-[10px]">{activeProject?.name}</span>
      </div>

      <div className="border border-[#1a3a1a] bg-[#050505]">
        {sprintGroups.map((group) => {
          const isSprintExpanded = expandedSprint === group.sprint.id;
          const sprintColor = group.percent === 100 ? 'text-[#00ff00]' : 'text-[#ffaa00]';

          return (
            <div key={group.sprint.id}>
              {/* Sprint header */}
              <div
                className="flex items-center gap-0 px-2 py-1.5 hover:bg-[#0a1a0a] transition-colors border-b border-[#1a3a1a] cursor-pointer"
                onClick={() => setExpandedSprint(isSprintExpanded ? null : group.sprint.id)}
              >
                <span className="w-[24px] terminal-dim text-[10px]">
                  {isSprintExpanded ? '[-]' : '[+]'}
                </span>
                <span className={`flex-1 font-bold uppercase text-[11px] ${sprintColor}`}>
                  {group.sprint.name}
                </span>
                <span className={`w-[110px] text-center text-[10px] ${sprintColor}`}>
                  {miniBar(group.percent)} {group.percent}%
                </span>
                <span className="w-[50px] text-right text-[10px] text-[#00ff00]">
                  {group.completed}/{group.total}
                </span>
              </div>

              {/* Sections inside sprint */}
              {isSprintExpanded && (
                <div className="bg-[#030303]">
                  {/* Section table header */}
                  <div className="flex items-center gap-0 px-2 py-0.5 border-b border-[#0a1a0a] terminal-dim text-[9px]">
                    <span className="w-[36px]"></span>
                    <span className="flex-1">SECTION</span>
                    <span className="w-[110px] text-center">PROGRESS</span>
                    <span className="w-[40px] text-right">DONE</span>
                    <span className="w-[30px] text-right">ACT</span>
                    <span className="w-[30px] text-right">BLK</span>
                  </div>

                  {group.sections.map((section) => {
                    const sectionKey = `${group.sprint.id}:${section.name}`;
                    const isSectionExpanded = expandedSection === sectionKey;
                    const statusColor = section.percent === 100
                      ? 'text-[#00ff00]'
                      : section.blocked > 0
                        ? 'terminal-error'
                        : section.inProgress > 0
                          ? 'text-[#00ccff]'
                          : 'terminal-dim';

                    return (
                      <div key={sectionKey}>
                        <div
                          className="flex items-center gap-0 px-2 py-0.5 hover:bg-[#0a1a0a] transition-colors border-b border-[#0a1a0a] text-[10px] cursor-pointer"
                          onClick={() => setExpandedSection(isSectionExpanded ? null : sectionKey)}
                        >
                          <span className="w-[12px]"></span>
                          <span className="w-[24px] terminal-dim">
                            {isSectionExpanded ? '[-]' : '[+]'}
                          </span>
                          <span className="flex-1 truncate text-[#00cc00]">
                            {section.name}
                          </span>
                          <span className={`w-[110px] text-center ${statusColor}`}>
                            {miniBar(section.percent)} {section.percent}%
                          </span>
                          <span className="w-[40px] text-right text-[#00ff00]">
                            {section.completed}/{section.total}
                          </span>
                          <span className={`w-[30px] text-right ${section.inProgress > 0 ? 'text-[#00ccff]' : 'terminal-dim'}`}>
                            {section.inProgress}
                          </span>
                          <span className={`w-[30px] text-right ${section.blocked > 0 ? 'terminal-error' : 'terminal-dim'}`}>
                            {section.blocked}
                          </span>
                        </div>

                        {/* Expanded task list */}
                        {isSectionExpanded && (
                          <div className="bg-[#050505] border-b border-[#0a1a0a]">
                            {section.tasks.map((task) => {
                              const st = STATUS_CHARS[task.status] || STATUS_CHARS.backlog;
                              return (
                                <div
                                  key={task.id}
                                  onClick={() => selectTask(task.id)}
                                  className="cursor-pointer hover:bg-[#0a1a0a] px-6 py-0.5 text-[10px] flex items-center gap-1"
                                >
                                  <span className={st.color}>[{st.char}]</span>
                                  <span className="text-[#00cc00] truncate flex-1">{task.title}</span>
                                  {task.assignedAgent && (
                                    <span className="terminal-dim">@{task.assignedAgent}</span>
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
