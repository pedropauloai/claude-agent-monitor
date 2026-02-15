import { useMemo } from 'react';
import { useSprint } from '../../../hooks/use-sprint';
import { useTasks } from '../../../hooks/use-tasks';

export function PixelSprintProgress() {
  const { activeSprint } = useSprint();
  const tasks = useTasks();

  const stats = useMemo(() => {
    if (!activeSprint) {
      return { total: 0, completed: 0, inProgress: 0, blocked: 0, pending: 0, percent: 0 };
    }

    const sprintTasks = tasks.filter((t) => t.sprintId === activeSprint.id);
    const total = sprintTasks.length || activeSprint.totalTasks || 0;
    const completed = sprintTasks.filter((t) => t.status === 'completed').length;
    const inProgress = sprintTasks.filter((t) => t.status === 'in_progress').length;
    const blocked = sprintTasks.filter((t) => t.status === 'blocked').length;
    const pending = total - completed - inProgress - blocked;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, blocked, pending, percent };
  }, [activeSprint, tasks]);

  if (!activeSprint) {
    return (
      <div className="p-4 text-center">
        <p className="pixel-text-xs" style={{ color: 'var(--pixel-text-muted)' }}>
          NO ACTIVE CHAPTER
        </p>
      </div>
    );
  }

  // Calculate level from percentage
  const level = Math.floor(stats.percent / 10);

  return (
    <div className="p-4" style={{ borderBottom: '3px solid var(--pixel-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="pixel-text-xs" style={{ color: 'var(--pixel-gold)' }}>
          \📖 CHAPTER PROGRESS
        </span>
        <span className="pixel-text-xs" style={{ color: 'var(--pixel-text-muted)' }}>
          {activeSprint.name}
        </span>
      </div>

      {/* XP Bar - Main progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="pixel-text-xs" style={{ color: 'var(--pixel-xp)' }}>
            XP LV.{level}
          </span>
          <span className="pixel-text-sm font-bold" style={{ color: 'var(--pixel-gold)' }}>
            {stats.percent}%
          </span>
        </div>
        <div className="pixel-bar-container pixel-bar-xp" style={{ height: '16px' }}>
          <div
            className="pixel-bar-fill"
            style={{ width: `${stats.percent}%`, transition: 'width 0.5s steps(8)' }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="pixel-text-xs" style={{ color: 'var(--pixel-text-dim)' }}>
            {stats.completed}/{stats.total} QUESTS
          </span>
          {stats.percent === 100 && (
            <span className="pixel-text-xs pixel-bounce" style={{ color: 'var(--pixel-gold)' }}>
              CHAPTER COMPLETE!
            </span>
          )}
        </div>
      </div>

      {/* Stats Breakdown */}
      <div className="space-y-1">
        {[
          { label: 'VICTORIES', value: stats.completed, icon: '\🏆', color: 'var(--pixel-green)', barClass: 'pixel-bar-green' },
          { label: 'IN BATTLE', value: stats.inProgress, icon: '\u2694', color: 'var(--pixel-cyan)', barClass: 'pixel-bar-purple' },
          { label: 'WAITING', value: stats.pending, icon: '\u231B', color: 'var(--pixel-orange)', barClass: 'pixel-bar-xp' },
          { label: 'SEALED', value: stats.blocked, icon: '\🔒', color: 'var(--pixel-error)', barClass: 'pixel-bar-hp' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="pixel-text-xs" style={{ width: '14px' }}>{item.icon}</span>
            <span className="pixel-text-xs flex-1" style={{ color: item.color }}>
              {item.label}
            </span>
            <span className="pixel-text-xs font-bold" style={{ color: 'var(--pixel-text)' }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
