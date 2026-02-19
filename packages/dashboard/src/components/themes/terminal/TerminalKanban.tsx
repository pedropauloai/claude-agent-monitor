import { useProjectStore } from '../../../stores/project-store';
import { KANBAN_COLUMNS } from '../../../stores/kanban-store';
import { useTasks } from '../../../hooks/use-tasks';
import { useResolveAgentName } from '../../../hooks/use-resolve-agent-name';
import { extractSprintLabel } from '../../../lib/formatters';
import type { PRDTask, PRDTaskStatus } from '@claudecam/shared';

const COLUMN_CHARS: Record<string, string> = {
  backlog: '.',
  planned: '-',
  in_progress: '*',
  in_review: '?',
  completed: '+',
  blocked: '!',
};

const COLUMN_COLORS: Record<string, string> = {
  backlog: 'terminal-dim',
  planned: 'text-[#00ccff]',
  in_progress: 'text-[#00ff00]',
  in_review: 'terminal-muted',
  completed: 'text-[#00ff00]',
  blocked: 'terminal-error',
};

const PRIORITY_CHARS: Record<string, string> = {
  critical: '!!!',
  high: '!! ',
  medium: '!  ',
  low: '.  ',
};

export function TerminalKanban() {
  const tasks = useTasks();

  const mapStatusToColumn = (status: PRDTaskStatus): PRDTaskStatus => {
    if (status === 'pending') return 'planned';
    if (status === 'deferred') return 'backlog';
    if (status === 'in_review') return 'in_progress';
    if (status === 'blocked') return 'in_progress';
    return status;
  };

  const tasksByStatus = KANBAN_COLUMNS.reduce<Record<PRDTaskStatus, PRDTask[]>>((acc, col) => {
    acc[col.id] = tasks.filter((t) => mapStatusToColumn(t.status) === col.id);
    return acc;
  }, {} as Record<PRDTaskStatus, PRDTask[]>);

  if (tasks.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center font-mono text-[11px]">
        <div className="terminal-dim text-center">
          <pre className="text-[10px]">{
`\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502  No tasks loaded  \u2502
\u2502  Import a sprint   \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518`
          }</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex gap-1 p-2 overflow-x-auto terminal-scrollbar font-mono text-[11px]">
      {KANBAN_COLUMNS.map((column) => {
        const columnTasks = tasksByStatus[column.id] || [];
        const colColor = COLUMN_COLORS[column.id] || 'terminal-dim';
        const colChar = COLUMN_CHARS[column.id] || ' ';

        return (
          <div
            key={column.id}
            className="flex-shrink-0 w-52 flex flex-col border border-[#1a3a1a] bg-[#0a0a0a]"
          >
            {/* Column Header with box-drawing */}
            <div className="px-2 py-1 border-b border-[#1a3a1a] shrink-0">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase ${colColor}`}>
                  [{colChar}] {column.label}
                </span>
                <span className="terminal-dim text-[10px]">
                  ({columnTasks.length})
                </span>
              </div>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto terminal-scrollbar p-1 space-y-1">
              {columnTasks.map((task) => (
                <KanbanCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({ task }: { task: PRDTask }) {
  const { selectTask, selectedTaskId } = useProjectStore();
  const resolveAgentName = useResolveAgentName();
  const priChar = PRIORITY_CHARS[task.priority] || '   ';
  const sprintLabel = extractSprintLabel(task.prdSection);

  return (
    <div
      className={`terminal-card p-1.5 text-[10px] cursor-pointer ${selectedTaskId === task.id ? 'border border-[#00ccff]' : ''}`}
      onClick={() => selectTask(task.id)}
    >
      {/* Top row: priority + complexity + sprint */}
      <div className="flex items-center gap-1 mb-0.5">
        <span className={`${task.priority === 'critical' || task.priority === 'high' ? 'terminal-error' : 'terminal-dim'}`}>
          {priChar}
        </span>
        {task.complexity && (
          <span className="terminal-dim">C{task.complexity}</span>
        )}
        {sprintLabel && (
          <span className="text-[#00ff00]">[{sprintLabel}]</span>
        )}
      </div>

      {/* Title */}
      <div className="text-[#00cc00] leading-tight mb-1 line-clamp-2">
        {task.title}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between terminal-dim">
        {task.assignedAgent ? (
          <span>@{resolveAgentName(task.assignedAgent)}</span>
        ) : (
          <span className="italic">unassigned</span>
        )}
        {task.tags && task.tags.length > 0 && (
          <span>#{task.tags[0]}</span>
        )}
      </div>

      {/* Blocked indicator */}
      {task.blockedBy.length > 0 && (
        <div className="terminal-error mt-0.5">
          {'! blocked by ' + task.blockedBy.length + ' task' + (task.blockedBy.length > 1 ? 's' : '')}
        </div>
      )}
    </div>
  );
}
