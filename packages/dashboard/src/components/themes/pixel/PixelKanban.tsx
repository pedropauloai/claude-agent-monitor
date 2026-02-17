import { useProjectStore } from '../../../stores/project-store';
import { KANBAN_COLUMNS } from '../../../stores/kanban-store';
import { useTasks } from '../../../hooks/use-tasks';
import { useResolveAgentName } from '../../../hooks/use-resolve-agent-name';
import { getPriorityColor, generateIdenticon, extractSprintLabel } from '../../../lib/formatters';
import type { PRDTask, PRDTaskStatus } from '@cam/shared';

/** RPG quest status labels */
const QUEST_STATUS: Record<string, { label: string; icon: string; color: string }> = {
  backlog: { label: 'RUMORS', icon: '\💬', color: 'var(--pixel-text-dim)' },
  planned: { label: 'ACCEPTED', icon: '\📜', color: 'var(--pixel-blue)' },
  in_progress: { label: 'ACTIVE', icon: '\u2694', color: 'var(--pixel-green)' },
  in_review: { label: 'REPORTING', icon: '\🔍', color: 'var(--pixel-purple)' },
  completed: { label: 'COMPLETE!', icon: '\🏆', color: 'var(--pixel-gold)' },
  blocked: { label: 'SEALED', icon: '\🔒', color: 'var(--pixel-error)' },
};

/** Priority to RPG difficulty */
const DIFFICULTY: Record<string, { label: string; stars: string; color: string }> = {
  critical: { label: 'LEGENDARY', stars: '\u2605\u2605\u2605\u2605\u2605', color: 'var(--pixel-error)' },
  high: { label: 'EPIC', stars: '\u2605\u2605\u2605\u2605', color: 'var(--pixel-orange)' },
  medium: { label: 'RARE', stars: '\u2605\u2605\u2605', color: 'var(--pixel-blue)' },
  low: { label: 'COMMON', stars: '\u2605\u2605', color: 'var(--pixel-text-dim)' },
};

export function PixelKanban() {
  const tasks = useTasks();

  const mapStatusToColumn = (status: PRDTaskStatus): PRDTaskStatus => {
    if (status === 'pending') return 'planned';
    if (status === 'deferred') return 'backlog';
    return status;
  };

  const tasksByStatus = KANBAN_COLUMNS.reduce<Record<PRDTaskStatus, PRDTask[]>>((acc, col) => {
    acc[col.id] = tasks.filter((t) => mapStatusToColumn(t.status) === col.id);
    return acc;
  }, {} as Record<PRDTaskStatus, PRDTask[]>);

  if (tasks.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="pixel-text-2xl mb-4">\📜</div>
        <p className="pixel-text-sm" style={{ color: 'var(--pixel-text-muted)' }}>
          QUEST BOARD EMPTY
        </p>
        <p className="pixel-text-xs mt-2" style={{ color: 'var(--pixel-text-dim)' }}>
          NO QUESTS AVAILABLE
        </p>
        <p className="pixel-text-xs mt-1 pixel-blink" style={{ color: 'var(--pixel-gold)' }}>
          CHECK BACK LATER...
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex gap-2 p-3 overflow-x-auto pixel-scrollbar">
      {KANBAN_COLUMNS.map((column) => {
        const columnTasks = tasksByStatus[column.id] || [];
        const status = QUEST_STATUS[column.id] || { label: column.label, icon: '\u25A0', color: 'var(--pixel-text-muted)' };

        return (
          <div
            key={column.id}
            className="flex-shrink-0 w-56 flex flex-col pixel-card"
          >
            {/* Column Header */}
            <div
              className="px-3 py-2 shrink-0"
              style={{ borderBottom: '3px solid var(--pixel-border)' }}
            >
              <div className="flex items-center justify-between">
                <span className="pixel-text-xs" style={{ color: status.color }}>
                  {status.icon} {status.label}
                </span>
                <span
                  className="pixel-text-xs px-1.5 py-0.5"
                  style={{
                    color: 'var(--pixel-text)',
                    background: 'var(--pixel-bg-dark)',
                    border: '2px solid var(--pixel-border)',
                  }}
                >
                  {columnTasks.length}
                </span>
              </div>
            </div>

            {/* Column Content */}
            <div className="flex-1 overflow-y-auto pixel-scrollbar p-2 space-y-2">
              {columnTasks.map((task) => (
                <QuestCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function QuestCard({ task }: { task: PRDTask }) {
  const { selectTask, selectedTaskId } = useProjectStore();
  const resolveAgentName = useResolveAgentName();
  const difficulty = DIFFICULTY[task.priority] || DIFFICULTY.low;
  const agentColor = task.assignedAgent ? generateIdenticon(task.assignedAgent) : null;
  const agentDisplayName = task.assignedAgent ? resolveAgentName(task.assignedAgent) : null;
  const isCompleted = task.status === 'completed';
  const sprintLabel = extractSprintLabel(task.prdSection);

  return (
    <div
      className={`p-2 cursor-pointer ${isCompleted ? 'pixel-glow-gold' : selectedTaskId === task.id ? 'pixel-glow-green' : 'pixel-border-light'}`}
      onClick={() => selectTask(task.id)}
      style={{
        background: 'var(--pixel-bg-dark)',
        opacity: isCompleted ? 0.85 : 1,
      }}
    >
      {/* Difficulty + Complexity + Sprint */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <span className="pixel-text-xs" style={{ color: difficulty.color }}>
            [{difficulty.label}]
          </span>
          {sprintLabel && (
            <span
              className="pixel-text-xs px-1"
              style={{
                color: 'var(--pixel-gold)',
                background: 'rgba(255, 215, 0, 0.1)',
                border: '1px solid var(--pixel-gold)',
              }}
            >
              {sprintLabel}
            </span>
          )}
        </div>
        {task.complexity && (
          <span className="pixel-text-xs" style={{ color: 'var(--pixel-text-dim)' }}>
            C{task.complexity}
          </span>
        )}
      </div>

      {/* Stars */}
      <div className="mb-1">
        <span className="pixel-text-xs" style={{ color: difficulty.color }}>
          {difficulty.stars}
        </span>
      </div>

      {/* Title */}
      <h4
        className="pixel-text-xs leading-relaxed mb-2"
        style={{
          color: isCompleted ? 'var(--pixel-text-dim)' : 'var(--pixel-text)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {isCompleted && '\u2713 '}{task.title}
      </h4>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {task.assignedAgent && agentColor ? (
          <div className="flex items-center gap-1">
            <div
              className="w-4 h-4 flex items-center justify-center pixel-text-xs"
              style={{
                background: `${agentColor}30`,
                color: agentColor,
                border: '1px solid var(--pixel-border)',
              }}
            >
              {(agentDisplayName ?? '?').charAt(0).toUpperCase()}
            </div>
            <span className="pixel-text-xs" style={{ color: 'var(--pixel-text-dim)' }}>
              {agentDisplayName}
            </span>
          </div>
        ) : (
          <span className="pixel-text-xs" style={{ color: 'var(--pixel-text-dim)' }}>
            UNASSIGNED
          </span>
        )}

        {task.tags && task.tags.length > 0 && (
          <span className="pixel-text-xs" style={{ color: 'var(--pixel-text-dim)' }}>
            #{task.tags[0]}
          </span>
        )}
      </div>

      {/* Blocked indicator */}
      {task.blockedBy.length > 0 && (
        <div className="mt-1 pixel-text-xs pixel-shake" style={{ color: 'var(--pixel-error)' }}>
          \🔒 SEALED BY {task.blockedBy.length} QUEST{task.blockedBy.length > 1 ? 'S' : ''}
        </div>
      )}
    </div>
  );
}
