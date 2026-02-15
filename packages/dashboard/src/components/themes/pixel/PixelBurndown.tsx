import { useTasks } from '../../../hooks/use-tasks';
import { useProjectStore } from '../../../stores/project-store';

export function PixelBurndown() {
  const tasks = useTasks();
  const { activeSprint } = useProjectStore();
  const sprintTasks = activeSprint
    ? tasks.filter((t) => t.sprintId === activeSprint.id)
    : tasks;

  const total = sprintTasks.length;
  const completed = sprintTasks.filter((t) => t.status === 'completed').length;
  const remaining = total - completed;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Build ASCII chart
  const barWidth = 20;
  const rows = 8;

  if (total === 0) {
    return (
      <div className="pixel-panel p-3">
        <h3 className="pixel-title text-xs mb-2">BURNDOWN</h3>
        <p className="text-[10px] text-pixel-dim">No quest data...</p>
      </div>
    );
  }

  return (
    <div className="pixel-panel p-3">
      <h3 className="pixel-title text-xs mb-2">
        BURNDOWN <span className="text-pixel-dim">LV.{pct}</span>
      </h3>

      {/* ASCII Chart */}
      <div className="font-mono text-[9px] leading-tight text-pixel-green">
        {Array.from({ length: rows }).map((_, row) => {
          const threshold = ((rows - row) / rows) * total;
          const idealAtRow = Math.round(((rows - row) / rows) * total);
          const bar = Array.from({ length: barWidth }).map((_, col) => {
            const progress = (col / barWidth) * total;
            if (progress <= completed && row >= rows - Math.ceil((remaining / total) * rows)) {
              return '*';
            }
            if (idealAtRow >= threshold) return '.';
            return ' ';
          }).join('');
          return (
            <div key={row}>
              {String(Math.round(threshold)).padStart(3, ' ')}|{bar}|
            </div>
          );
        })}
        <div>{'   +' + '-'.repeat(barWidth) + '+'}</div>
      </div>

      {/* Stats */}
      <div className="mt-2 flex gap-3 text-[9px]">
        <span className="text-pixel-green">Done: {completed}</span>
        <span className="text-pixel-yellow">Left: {remaining}</span>
        <span className="text-pixel-dim">Total: {total}</span>
      </div>
    </div>
  );
}
