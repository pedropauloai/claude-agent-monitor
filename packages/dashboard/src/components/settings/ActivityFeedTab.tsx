import { useState } from 'react';
import { useSettingsStore } from '../../stores/settings-store.js';

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-cam-text-secondary">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
          checked ? 'bg-cam-accent' : 'bg-cam-surface-3 border border-cam-border'
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

export function ActivityFeedTab() {
  const followMode = useSettingsStore((s) => s.followMode);
  const hidePolling = useSettingsStore((s) => s.hidePolling);
  const pollingTools = useSettingsStore((s) => s.pollingTools);
  const groupRepetitive = useSettingsStore((s) => s.groupRepetitive);
  const toggleFollowMode = useSettingsStore((s) => s.toggleFollowMode);
  const toggleHidePolling = useSettingsStore((s) => s.toggleHidePolling);
  const toggleGroupRepetitive = useSettingsStore((s) => s.toggleGroupRepetitive);
  const addPollingTool = useSettingsStore((s) => s.addPollingTool);
  const removePollingTool = useSettingsStore((s) => s.removePollingTool);

  const [newTool, setNewTool] = useState('');

  const handleAddTool = () => {
    const trimmed = newTool.trim();
    if (trimmed === '') return;
    addPollingTool(trimmed);
    setNewTool('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTool();
    }
  };

  return (
    <div className="space-y-6">
      {/* Follow Mode */}
      <section>
        <ToggleSwitch
          checked={followMode}
          onChange={toggleFollowMode}
          label="Auto-scroll para eventos recentes"
        />
        <p className="text-[10px] text-cam-text-muted mt-1.5 ml-0.5">
          Rola automaticamente o feed para mostrar novos eventos.
        </p>
      </section>

      {/* Hide Polling */}
      <section>
        <ToggleSwitch
          checked={hidePolling}
          onChange={toggleHidePolling}
          label="Esconder ferramentas repetitivas"
        />
        <p className="text-[10px] text-cam-text-muted mt-1.5 ml-0.5">
          Oculta eventos de ferramentas que fazem polling constante.
        </p>
      </section>

      {/* Polling Tools List */}
      <section>
        <h3 className="text-sm font-medium text-cam-text mb-3">
          Ferramentas de polling
        </h3>
        <p className="text-[10px] text-cam-text-muted mb-2">
          Ferramentas que serao ocultadas quando "Esconder ferramentas repetitivas" estiver ativo.
        </p>

        {/* Tags/chips */}
        <div className="flex flex-wrap gap-1.5 mb-3 min-h-[28px]">
          {pollingTools.map((tool) => (
            <span
              key={tool}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md bg-cam-surface-3 text-cam-text-secondary border border-cam-border"
            >
              {tool}
              <button
                onClick={() => removePollingTool(tool)}
                className="text-cam-text-muted hover:text-cam-error transition-colors ml-0.5"
                aria-label={`Remover ${tool}`}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <line x1="2" y1="2" x2="8" y2="8" />
                  <line x1="8" y1="2" x2="2" y2="8" />
                </svg>
              </button>
            </span>
          ))}
          {pollingTools.length === 0 && (
            <span className="text-[10px] text-cam-text-muted italic">
              Nenhuma ferramenta configurada
            </span>
          )}
        </div>

        {/* Add tool input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newTool}
            onChange={(e) => setNewTool(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nome da ferramenta..."
            className="flex-1 px-3 py-1.5 text-xs rounded-md border border-cam-border bg-cam-surface-2 text-cam-text placeholder:text-cam-text-muted focus:outline-none focus:ring-1 focus:ring-cam-accent"
          />
          <button
            onClick={handleAddTool}
            disabled={newTool.trim() === ''}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-cam-accent text-white hover:bg-cam-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            Adicionar
          </button>
        </div>
      </section>

      {/* Group Repetitive Events */}
      <section>
        <ToggleSwitch
          checked={groupRepetitive}
          onChange={toggleGroupRepetitive}
          label="Agrupar eventos repetitivos consecutivos"
        />
        <p className="text-[10px] text-cam-text-muted mt-1.5 ml-0.5">
          Eventos identicos consecutivos sao agrupados com contador.
        </p>
      </section>
    </div>
  );
}
