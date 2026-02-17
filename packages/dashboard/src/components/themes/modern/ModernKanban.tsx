import { motion, AnimatePresence } from 'framer-motion';
import { useProjectStore } from '../../../stores/project-store';
import { KANBAN_COLUMNS } from '../../../stores/kanban-store';
import { useTasks } from '../../../hooks/use-tasks';
import { useResolveAgentName } from '../../../hooks/use-resolve-agent-name';
import {
  getPriorityColor,
  getTaskStatusColor,
  generateIdenticon,
  extractSprintLabel,
} from '../../../lib/formatters';
import type { PRDTask, PRDTaskStatus } from '@cam/shared';

const COLUMN_HEADER_COLORS: Record<string, string> = {
  backlog: 'text-gray-400',
  planned: 'text-blue-400',
  in_progress: 'text-emerald-400',
  in_review: 'text-purple-400',
  completed: 'text-green-400',
  blocked: 'text-red-400',
};

export function ModernKanban() {
  const tasks = useTasks();

  // Map task statuses to kanban columns
  // 'pending' and 'planned' both go to the 'planned' column
  // 'deferred' goes to 'backlog'
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
        <div className="w-14 h-14 rounded-full bg-cam-surface-2 border border-cam-border flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-cam-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
        </div>
        <p className="text-sm text-cam-text-muted">No PRD tasks loaded</p>
        <p className="text-xs text-cam-text-muted mt-1">
          Import a PRD to see tasks on the Kanban board
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex gap-2 p-3 overflow-x-auto modern-scrollbar">
      {KANBAN_COLUMNS.map((column) => {
        const columnTasks = tasksByStatus[column.id] || [];
        const headerColor = COLUMN_HEADER_COLORS[column.id] || 'text-cam-text-muted';

        return (
          <div
            key={column.id}
            className="flex-shrink-0 w-56 flex flex-col rounded-lg bg-cam-surface/30 border border-cam-border/30"
          >
            {/* Column Header */}
            <div className="px-3 py-2 border-b border-cam-border/20 shrink-0">
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${headerColor}`}>
                  {column.label}
                </span>
                <span className="text-[10px] text-cam-text-muted bg-cam-surface-2 px-1.5 py-0.5 rounded-full">
                  {columnTasks.length}
                </span>
              </div>
            </div>

            {/* Column Content */}
            <div className="flex-1 overflow-y-auto modern-scrollbar p-2 space-y-1.5">
              <AnimatePresence>
                {columnTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <KanbanCard task={task} />
                  </motion.div>
                ))}
              </AnimatePresence>
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
  const priorityStyle = getPriorityColor(task.priority);
  const agentColor = task.assignedAgent ? generateIdenticon(task.assignedAgent) : null;
  const agentDisplayName = task.assignedAgent ? resolveAgentName(task.assignedAgent) : null;
  const sprintLabel = extractSprintLabel(task.prdSection);

  return (
    <div
      className={`modern-card p-2.5 cursor-pointer group ${selectedTaskId === task.id ? 'ring-1 ring-cam-accent' : ''}`}
      onClick={() => selectTask(task.id)}
    >
      {/* Priority + Complexity + Sprint */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${priorityStyle}`}>
          {task.priority}
        </span>
        {task.complexity && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-cam-surface-3 text-cam-text-muted border border-cam-border/50">
            C{task.complexity}
          </span>
        )}
        {sprintLabel && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cam-accent/10 text-cam-accent font-mono">
            {sprintLabel}
          </span>
        )}
      </div>

      {/* Title */}
      <h4 className="text-[11px] font-medium text-cam-text leading-tight mb-2 line-clamp-2">
        {task.title}
      </h4>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Agent */}
        {task.assignedAgent && agentColor ? (
          <div className="flex items-center gap-1">
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
              style={{ backgroundColor: `${agentColor}20`, color: agentColor }}
            >
              {(agentDisplayName ?? '?').charAt(0).toUpperCase()}
            </div>
            <span className="text-[9px] text-cam-text-muted">{agentDisplayName}</span>
          </div>
        ) : (
          <span className="text-[9px] text-cam-text-muted italic">Unassigned</span>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <span className="text-[8px] text-cam-text-muted">
            {task.tags[0]}
          </span>
        )}
      </div>

      {/* Blocked indicator */}
      {task.blockedBy.length > 0 && (
        <div className="mt-1.5 flex items-center gap-1 text-[9px] text-cam-error">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          Blocked by {task.blockedBy.length} task{task.blockedBy.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
