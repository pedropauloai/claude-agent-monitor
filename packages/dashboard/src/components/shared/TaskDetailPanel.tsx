import { useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/project-store';
import { useResolveAgentName } from '../../hooks/use-resolve-agent-name';
import { getTaskActivity } from '../../lib/api';
import {
  getPriorityColor,
  getTaskStatusColor,
  formatTimestamp,
  formatRelativeTime,
  generateIdenticon,
} from '../../lib/formatters';
import type { PRDTask } from '@claudecam/shared';

type TabId = 'overview' | 'dependencies' | 'activity';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'dependencies', label: 'Deps' },
  { id: 'activity', label: 'Activity' },
];

interface TaskActivity {
  id: string;
  activityType: string;
  agentId: string;
  timestamp: string;
  details?: string;
}

export function TaskDetailPanel() {
  const { selectedTaskId, tasks, selectTask, sprints, activeProject } = useProjectStore();
  const resolveAgentName = useResolveAgentName();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  const task = tasks.find((t) => t.id === selectedTaskId);

  // Load activities when Activity tab is selected
  useEffect(() => {
    if (activeTab === 'activity' && task && activeProject) {
      setLoadingActivities(true);
      getTaskActivity(activeProject.id, task.id)
        .then((res) => setActivities(res.activities ?? []))
        .catch(() => setActivities([]))
        .finally(() => setLoadingActivities(false));
    }
  }, [activeTab, task?.id, activeProject?.id]);

  if (!task) return null;

  const sprint = sprints.find((s) => s.id === task.sprintId);
  const priorityStyle = getPriorityColor(task.priority);
  const statusStyle = getTaskStatusColor(task.status);

  // Resolve dependency tasks
  const dependsOnTasks = task.dependsOn
    .map((id) => tasks.find((t) => t.id === id))
    .filter((t): t is PRDTask => t !== undefined);
  const blockedByTasks = task.blockedBy
    .map((id) => tasks.find((t) => t.id === id))
    .filter((t): t is PRDTask => t !== undefined);
  const blocksTasks = tasks.filter(
    (t) => t.dependsOn.includes(task.id) || t.blockedBy.includes(task.id)
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-cam-border/30 shrink-0">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-sm font-semibold text-cam-text leading-tight flex-1 pr-2">
            {task.title}
          </h3>
          <button
            onClick={() => selectTask(null)}
            className="text-cam-text-muted hover:text-cam-text transition-colors p-1 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${priorityStyle}`}>
            {task.priority}
          </span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${statusStyle}`}>
            {task.status.replace(/_/g, ' ')}
          </span>
          {task.complexity && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cam-surface-3 text-cam-text-muted border border-cam-border/50">
              C{task.complexity}
            </span>
          )}
        </div>

        {/* Meta info */}
        <div className="grid grid-cols-2 gap-2">
          {sprint && (
            <div className="bg-cam-surface-2 rounded-md px-2 py-1.5">
              <div className="text-[9px] text-cam-text-muted">Sprint</div>
              <div className="text-[10px] text-cam-text font-medium truncate">{sprint.name}</div>
            </div>
          )}
          {task.prdSection && (
            <div className="bg-cam-surface-2 rounded-md px-2 py-1.5">
              <div className="text-[9px] text-cam-text-muted">Section</div>
              <div className="text-[10px] text-cam-text font-medium truncate">{task.prdSection}</div>
            </div>
          )}
          {task.assignedAgent && (() => {
            const agentName = resolveAgentName(task.assignedAgent);
            return (
              <div className="bg-cam-surface-2 rounded-md px-2 py-1.5">
                <div className="text-[9px] text-cam-text-muted">Agent</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <div
                    className="w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold"
                    style={{
                      backgroundColor: `${generateIdenticon(task.assignedAgent)}20`,
                      color: generateIdenticon(task.assignedAgent),
                    }}
                  >
                    {agentName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[10px] text-cam-text font-medium">{agentName}</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-cam-border/30 shrink-0">
        {TABS.map((tab) => {
          const count =
            tab.id === 'dependencies'
              ? dependsOnTasks.length + blockedByTasks.length + blocksTasks.length
              : tab.id === 'activity'
                ? activities.length
                : 0;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 text-[10px] font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'text-cam-accent border-cam-accent'
                  : 'text-cam-text-muted border-transparent hover:text-cam-text-secondary'
              }`}
            >
              {tab.label}
              {count > 0 && ` (${count})`}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto modern-scrollbar">
        {activeTab === 'overview' && <OverviewTab task={task} />}
        {activeTab === 'dependencies' && (
          <DependenciesTab
            dependsOn={dependsOnTasks}
            blockedBy={blockedByTasks}
            blocks={blocksTasks}
            onSelectTask={selectTask}
            resolveAgentName={resolveAgentName}
          />
        )}
        {activeTab === 'activity' && (
          <ActivityTab activities={activities} loading={loadingActivities} resolveAgentName={resolveAgentName} />
        )}
      </div>
    </div>
  );
}

function OverviewTab({ task }: { task: PRDTask }) {
  return (
    <div className="p-3 space-y-4">
      {/* Description */}
      {task.description && (
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-cam-text-muted font-medium mb-1">
            Description
          </h4>
          <p className="text-[11px] text-cam-text-secondary leading-relaxed">
            {task.description}
          </p>
        </div>
      )}

      {/* Acceptance Criteria */}
      {task.acceptanceCriteria && task.acceptanceCriteria.length > 0 && (
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-cam-text-muted font-medium mb-1">
            Acceptance Criteria
          </h4>
          <ul className="space-y-1">
            {task.acceptanceCriteria.map((criteria, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-cam-text-secondary">
                <span className="text-cam-accent mt-0.5 shrink-0">
                  {task.status === 'completed' ? '\u2713' : '\u25CB'}
                </span>
                <span>{criteria}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-cam-text-muted font-medium mb-1">
            Tags
          </h4>
          <div className="flex flex-wrap gap-1">
            {task.tags.map((tag) => (
              <span
                key={tag}
                className="text-[9px] px-1.5 py-0.5 rounded bg-cam-surface-3 text-cam-text-muted border border-cam-border/30"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Dates */}
      <div>
        <h4 className="text-[10px] uppercase tracking-wider text-cam-text-muted font-medium mb-1">
          Timeline
        </h4>
        <div className="space-y-1 text-[10px]">
          <div className="flex justify-between">
            <span className="text-cam-text-muted">Created</span>
            <span className="text-cam-text-secondary font-mono">{formatRelativeTime(task.createdAt)}</span>
          </div>
          {task.startedAt && (
            <div className="flex justify-between">
              <span className="text-cam-text-muted">Started</span>
              <span className="text-cam-text-secondary font-mono">{formatRelativeTime(task.startedAt)}</span>
            </div>
          )}
          {task.completedAt && (
            <div className="flex justify-between">
              <span className="text-cam-text-muted">Completed</span>
              <span className="text-cam-text-secondary font-mono">{formatRelativeTime(task.completedAt)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DependenciesTab({
  dependsOn,
  blockedBy,
  blocks,
  onSelectTask,
  resolveAgentName,
}: {
  dependsOn: PRDTask[];
  blockedBy: PRDTask[];
  blocks: PRDTask[];
  onSelectTask: (id: string) => void;
  resolveAgentName: (agentId: string) => string;
}) {
  if (dependsOn.length === 0 && blockedBy.length === 0 && blocks.length === 0) {
    return (
      <p className="text-xs text-cam-text-muted p-4 text-center">No dependencies</p>
    );
  }

  return (
    <div className="p-3 space-y-4">
      {blockedBy.length > 0 && (
        <DepSection
          title="Blocked By"
          tasks={blockedBy}
          color="text-red-400"
          onSelect={onSelectTask}
          resolveAgentName={resolveAgentName}
        />
      )}
      {dependsOn.length > 0 && (
        <DepSection
          title="Depends On"
          tasks={dependsOn}
          color="text-yellow-400"
          onSelect={onSelectTask}
          resolveAgentName={resolveAgentName}
        />
      )}
      {blocks.length > 0 && (
        <DepSection
          title="Blocks"
          tasks={blocks}
          color="text-blue-400"
          onSelect={onSelectTask}
          resolveAgentName={resolveAgentName}
        />
      )}
    </div>
  );
}

function DepSection({
  title,
  tasks,
  color,
  onSelect,
  resolveAgentName,
}: {
  title: string;
  tasks: PRDTask[];
  color: string;
  onSelect: (id: string) => void;
  resolveAgentName: (agentId: string) => string;
}) {
  return (
    <div>
      <h4 className={`text-[10px] uppercase tracking-wider font-medium mb-1 ${color}`}>
        {title} ({tasks.length})
      </h4>
      <div className="space-y-1">
        {tasks.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className="w-full text-left px-2 py-1.5 rounded hover:bg-cam-surface-2 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getTaskStatusDot(t.status)}`} />
              <span className="text-[11px] text-cam-text-secondary group-hover:text-cam-text truncate">
                {t.title}
              </span>
            </div>
            <div className="flex items-center gap-2 ml-3.5 mt-0.5">
              <span className="text-[9px] text-cam-text-muted capitalize">
                {t.status.replace(/_/g, ' ')}
              </span>
              {t.assignedAgent && (
                <span className="text-[9px] text-cam-text-muted">@{resolveAgentName(t.assignedAgent)}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function getTaskStatusDot(status: string): string {
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

function ActivityTab({
  activities,
  loading,
  resolveAgentName,
}: {
  activities: TaskActivity[];
  loading: boolean;
  resolveAgentName: (agentId: string) => string;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <span className="text-[10px] text-cam-text-muted animate-pulse">Loading activities...</span>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <p className="text-xs text-cam-text-muted p-4 text-center">No activity recorded</p>
    );
  }

  return (
    <div className="divide-y divide-cam-border/20">
      {activities.map((activity) => (
        <div key={activity.id} className="px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-cam-accent">
              {formatActivityType(activity.activityType)}
            </span>
            <span className="text-[9px] text-cam-text-muted font-mono">
              {formatTimestamp(activity.timestamp)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] text-cam-text-muted">@{resolveAgentName(activity.agentId)}</span>
          </div>
          {activity.details && (
            <p className="text-[10px] text-cam-text-secondary mt-0.5">{activity.details}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function formatActivityType(type: string): string {
  const labels: Record<string, string> = {
    task_created: 'Task Created',
    task_started: 'Task Started',
    task_completed: 'Task Completed',
    task_blocked: 'Task Blocked',
    task_unblocked: 'Task Unblocked',
    agent_assigned: 'Agent Assigned',
    file_modified: 'File Modified',
    error_occurred: 'Error Occurred',
    manual_update: 'Manual Update',
  };
  return labels[type] || type.replace(/_/g, ' ');
}
