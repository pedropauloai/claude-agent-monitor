import { useProjectStore, type ViewMode } from '../../../stores/project-store';

const VIEW_OPTIONS: { id: ViewMode; label: string; icon: string }[] = [
  { id: 'monitor', label: 'MONITOR', icon: '[M]' },
  { id: 'tracker', label: 'TRACKER', icon: '[T]' },
  { id: 'mission-control', label: 'MISSION', icon: '[C]' },
];

export function PixelProjectSelector() {
  const { viewMode, setViewMode } = useProjectStore();

  return (
    <div className="flex items-center gap-1">
      {VIEW_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          onClick={() => setViewMode(opt.id)}
          className={`pixel-btn text-[9px] px-2 py-1 ${
            viewMode === opt.id
              ? 'bg-pixel-green text-black'
              : 'text-pixel-dim hover:text-pixel-green'
          }`}
        >
          {opt.icon} {opt.label}
        </button>
      ))}
    </div>
  );
}
