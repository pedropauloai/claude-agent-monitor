import { useSettingsStore } from '../../stores/settings-store.js';
import type { DisplayMode } from '../../stores/settings-store.js';

const ACTIVITY_WINDOW_OPTIONS = [
  { value: 60_000, label: '1 minuto' },
  { value: 180_000, label: '3 minutos' },
  { value: 300_000, label: '5 minutos' },
  { value: 600_000, label: '10 minutos' },
];

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

export function AgentMapTab() {
  const showLabels = useSettingsStore((s) => s.showLabels);
  const showInteractions = useSettingsStore((s) => s.showInteractions);
  const displayMode = useSettingsStore((s) => s.displayMode);
  const activityWindow = useSettingsStore((s) => s.activityWindow);
  const toggleLabels = useSettingsStore((s) => s.toggleLabels);
  const toggleInteractions = useSettingsStore((s) => s.toggleInteractions);
  const setDisplayMode = useSettingsStore((s) => s.setDisplayMode);
  const setActivityWindow = useSettingsStore((s) => s.setActivityWindow);

  return (
    <div className="space-y-6">
      {/* Activity Labels */}
      <section>
        <ToggleSwitch
          checked={showLabels}
          onChange={toggleLabels}
          label="Mostrar etiquetas de atividade"
        />
        <p className="text-[10px] text-cam-text-muted mt-1.5 ml-0.5">
          Exibe o nome da ferramenta/acao acima de cada agente no mapa.
        </p>
      </section>

      {/* Communication Lines */}
      <section>
        <ToggleSwitch
          checked={showInteractions}
          onChange={toggleInteractions}
          label="Mostrar linhas de comunicacao"
        />
        <p className="text-[10px] text-cam-text-muted mt-1.5 ml-0.5">
          Desenha linhas conectando agentes que se comunicam entre si.
        </p>
      </section>

      {/* Speech Bubbles Display Mode */}
      <section>
        <h3 className="text-sm font-medium text-cam-text mb-3">Baloes de fala</h3>
        <div className="grid grid-cols-2 gap-2">
          {([
            { value: 'technical' as DisplayMode, label: 'Tecnico', description: 'Mostra funcao/ferramenta sendo executada' },
            { value: 'didactic' as DisplayMode, label: 'Didatico', description: 'Mostra explicacao amigavel' },
          ]).map((option) => (
            <button
              key={option.value}
              onClick={() => setDisplayMode(option.value)}
              className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all ${
                displayMode === option.value
                  ? 'border-cam-accent bg-cam-accent/10 ring-1 ring-cam-accent/30'
                  : 'border-cam-border hover:border-cam-border-hover bg-cam-surface-2'
              }`}
            >
              {/* Radio indicator */}
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                displayMode === option.value
                  ? 'border-cam-accent'
                  : 'border-cam-text-muted'
              }`}>
                {displayMode === option.value && (
                  <div className="w-2 h-2 rounded-full bg-cam-accent" />
                )}
              </div>
              <div className="text-left">
                <span className={`text-xs font-medium block ${
                  displayMode === option.value ? 'text-cam-accent' : 'text-cam-text-secondary'
                }`}>
                  {option.label}
                </span>
                <span className="text-[10px] text-cam-text-muted leading-tight">
                  {option.description}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Activity Window */}
      <section>
        <h3 className="text-sm font-medium text-cam-text mb-3">Janela de atividade</h3>
        <p className="text-[10px] text-cam-text-muted mb-2">
          Tempo maximo para considerar um agente como ativo.
        </p>
        <select
          value={activityWindow}
          onChange={(e) => setActivityWindow(Number(e.target.value))}
          className="w-full px-3 py-2 text-xs rounded-md border border-cam-border bg-cam-surface-2 text-cam-text focus:outline-none focus:ring-1 focus:ring-cam-accent appearance-none cursor-pointer"
        >
          {ACTIVITY_WINDOW_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </section>
    </div>
  );
}
