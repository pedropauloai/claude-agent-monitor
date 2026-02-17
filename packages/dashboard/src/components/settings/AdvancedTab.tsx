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

function NumberInput({
  value,
  onChange,
  min,
  max,
  label,
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  label: string;
  suffix?: string;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.min(max, Math.max(min, parsed));
    onChange(clamped);
  };

  const increment = () => {
    if (value < max) onChange(value + 1);
  };

  const decrement = () => {
    if (value > min) onChange(value - 1);
  };

  return (
    <div>
      <label className="text-xs text-cam-text-secondary block mb-1.5">{label}</label>
      <div className="flex items-center gap-1">
        <button
          onClick={decrement}
          disabled={value <= min}
          className="w-7 h-7 flex items-center justify-center rounded-md border border-cam-border bg-cam-surface-2 text-cam-text-secondary hover:text-cam-text hover:bg-cam-surface-3 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-mono"
          aria-label="Diminuir"
        >
          -
        </button>
        <input
          type="number"
          value={value}
          onChange={handleChange}
          min={min}
          max={max}
          className="w-20 px-2 py-1 text-xs text-center rounded-md border border-cam-border bg-cam-surface-2 text-cam-text focus:outline-none focus:ring-1 focus:ring-cam-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          onClick={increment}
          disabled={value >= max}
          className="w-7 h-7 flex items-center justify-center rounded-md border border-cam-border bg-cam-surface-2 text-cam-text-secondary hover:text-cam-text hover:bg-cam-surface-3 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-mono"
          aria-label="Aumentar"
        >
          +
        </button>
        {suffix && (
          <span className="text-[10px] text-cam-text-muted ml-1">{suffix}</span>
        )}
      </div>
      <p className="text-[10px] text-cam-text-muted mt-1">
        Min: {min} / Max: {max}
      </p>
    </div>
  );
}

export function AdvancedTab() {
  const maxEvents = useSettingsStore((s) => s.maxEvents);
  const speechBubbleTimeout = useSettingsStore((s) => s.speechBubbleTimeout);
  const maxCommunicationLines = useSettingsStore((s) => s.maxCommunicationLines);
  const lockPanels = useSettingsStore((s) => s.lockPanels);
  const setMaxEvents = useSettingsStore((s) => s.setMaxEvents);
  const setSpeechBubbleTimeout = useSettingsStore((s) => s.setSpeechBubbleTimeout);
  const setMaxCommunicationLines = useSettingsStore((s) => s.setMaxCommunicationLines);
  const toggleLockPanels = useSettingsStore((s) => s.toggleLockPanels);
  const resetToDefaults = useSettingsStore((s) => s.resetToDefaults);

  const [showResetSuccess, setShowResetSuccess] = useState(false);

  const handleReset = () => {
    const confirmed = window.confirm(
      'Tem certeza que deseja restaurar todas as configuracoes para os valores padrao?'
    );
    if (!confirmed) return;

    resetToDefaults();
    setShowResetSuccess(true);
    setTimeout(() => setShowResetSuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Max Events */}
      <section>
        <NumberInput
          value={maxEvents}
          onChange={setMaxEvents}
          min={100}
          max={10000}
          label="Maximo de eventos em memoria"
          suffix="eventos"
        />
        <p className="text-[10px] text-cam-text-muted mt-1">
          Quantidade maxima de eventos mantidos no dashboard. Valores altos usam mais memoria.
        </p>
      </section>

      {/* Speech Bubble Timeout */}
      <section>
        <NumberInput
          value={speechBubbleTimeout}
          onChange={setSpeechBubbleTimeout}
          min={1}
          max={30}
          label="Timeout dos baloes de fala"
          suffix="segundos"
        />
        <p className="text-[10px] text-cam-text-muted mt-1">
          Tempo que cada balao permanece visivel antes de desaparecer.
        </p>
      </section>

      {/* Max Communication Lines */}
      <section>
        <NumberInput
          value={maxCommunicationLines}
          onChange={setMaxCommunicationLines}
          min={1}
          max={20}
          label="Maximo de linhas de comunicacao"
        />
        <p className="text-[10px] text-cam-text-muted mt-1">
          Quantidade maxima de linhas de interacao visiveis simultaneamente no Agent Map.
        </p>
      </section>

      {/* Lock Panels */}
      <section>
        <ToggleSwitch
          checked={lockPanels}
          onChange={toggleLockPanels}
          label="Travar redimensionamento de paineis"
        />
        <p className="text-[10px] text-cam-text-muted mt-1.5 ml-0.5">
          Impede o redimensionamento acidental dos paineis do dashboard.
        </p>
      </section>

      {/* Restore Defaults */}
      <section className="pt-2 border-t border-cam-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-cam-text">Restaurar Padroes</h3>
            <p className="text-[10px] text-cam-text-muted mt-0.5">
              Redefine todas as configuracoes para os valores originais.
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-cam-error/50 text-cam-error hover:bg-cam-error/10 transition-colors shrink-0"
          >
            Restaurar Padroes
          </button>
        </div>
        {showResetSuccess && (
          <div className="mt-2 px-3 py-1.5 text-[11px] text-cam-success bg-cam-success/10 border border-cam-success/30 rounded-md">
            Configuracoes restauradas com sucesso!
          </div>
        )}
      </section>
    </div>
  );
}
