import { useState } from 'react';
import { useSettingsStore } from '../../stores/settings-store.js';
import type { ThemeName, SpriteResolution } from '../../stores/settings-store.js';
import { SpritePreview } from './SpritePreview.js';

const THEME_OPTIONS: { value: ThemeName; label: string; description: string }[] = [
  { value: 'modern', label: 'Modern', description: 'Interface limpa e minimalista' },
  { value: 'pixel', label: 'Pixel', description: 'Estilo retro pixel art' },
  { value: 'terminal', label: 'Terminal', description: 'Estilo console hacker' },
];

const PRESET_COLORS = [
  { value: '#3b82f6', label: 'Azul' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#22c55e', label: 'Verde' },
  { value: '#f59e0b', label: 'Ambar' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#06b6d4', label: 'Ciano' },
  { value: '#f97316', label: 'Laranja' },
];

const SPRITE_OPTIONS: { value: SpriteResolution; label: string; description: string }[] = [
  { value: '16x16', label: 'Classic', description: '16x16 pixels' },
  { value: '24x24', label: 'Detailed', description: '24x24 pixels' },
  { value: '32x32', label: 'HD', description: '32x32 pixels' },
  { value: '48x48', label: 'Ultra', description: '48x48 pixels' },
];

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export function AppearanceTab() {
  const theme = useSettingsStore((s) => s.theme);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const spriteResolution = useSettingsStore((s) => s.spriteResolution);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setAccentColor = useSettingsStore((s) => s.setAccentColor);
  const setSpriteResolution = useSettingsStore((s) => s.setSpriteResolution);

  const [customColor, setCustomColor] = useState(
    PRESET_COLORS.some((c) => c.value === accentColor) ? '' : accentColor
  );
  const [colorError, setColorError] = useState(false);

  const handleCustomColorChange = (value: string) => {
    setCustomColor(value);
    setColorError(false);

    if (value === '') return;

    // Auto-add # if missing
    const normalized = value.startsWith('#') ? value : `#${value}`;

    if (HEX_COLOR_REGEX.test(normalized)) {
      setAccentColor(normalized);
      setColorError(false);
    } else if (normalized.length >= 7) {
      setColorError(true);
    }
  };

  const handlePresetClick = (color: string) => {
    setAccentColor(color);
    setCustomColor('');
    setColorError(false);
  };

  return (
    <div className="space-y-6">
      {/* Tema */}
      <section>
        <h3 className="text-sm font-medium text-cam-text mb-3">Tema</h3>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${
                theme === option.value
                  ? 'border-cam-accent bg-cam-accent/10 ring-1 ring-cam-accent/30'
                  : 'border-cam-border hover:border-cam-border-hover bg-cam-surface-2'
              }`}
            >
              {/* Visual indicator */}
              <div className={`w-full h-8 rounded-md ${
                option.value === 'modern'
                  ? 'bg-gradient-to-br from-cam-surface-3 to-cam-bg'
                  : option.value === 'pixel'
                    ? 'bg-[#1a1a2e] border border-[#533483]'
                    : 'bg-black border border-[#1a3a1a]'
              }`}>
                <div className={`w-3 h-1.5 mt-1.5 ml-1.5 rounded-sm ${
                  option.value === 'modern'
                    ? 'bg-cam-accent'
                    : option.value === 'pixel'
                      ? 'bg-[#e94560]'
                      : 'bg-[#00ff00]'
                }`} />
              </div>
              <span className={`text-xs font-medium ${
                theme === option.value ? 'text-cam-accent' : 'text-cam-text-secondary'
              }`}>
                {option.label}
              </span>
              <span className="text-[10px] text-cam-text-muted leading-tight text-center">
                {option.description}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Cor de destaque */}
      <section>
        <h3 className="text-sm font-medium text-cam-text mb-3">Cor de destaque</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {PRESET_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => handlePresetClick(color.value)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                accentColor === color.value
                  ? 'border-white ring-2 ring-offset-2 ring-offset-cam-surface scale-110'
                  : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.label}
              aria-label={`Cor ${color.label}`}
            />
          ))}
        </div>

        {/* Custom color input */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-cam-text-muted shrink-0">Cor personalizada:</label>
          <div className="relative flex-1">
            <input
              type="text"
              value={customColor}
              onChange={(e) => handleCustomColorChange(e.target.value)}
              placeholder="#RRGGBB"
              maxLength={7}
              className={`w-full px-3 py-1.5 text-xs rounded-md border bg-cam-surface-2 text-cam-text placeholder:text-cam-text-muted focus:outline-none focus:ring-1 ${
                colorError
                  ? 'border-cam-error focus:ring-cam-error'
                  : 'border-cam-border focus:ring-cam-accent'
              }`}
            />
          </div>
          {customColor && !colorError && HEX_COLOR_REGEX.test(customColor) && (
            <div
              className="w-6 h-6 rounded-md border border-cam-border shrink-0"
              style={{ backgroundColor: customColor }}
            />
          )}
        </div>
        {colorError && (
          <p className="text-[10px] text-cam-error mt-1">
            Formato invalido. Use #RRGGBB (ex: #ff5500)
          </p>
        )}
      </section>

      {/* Resolucao de Sprites */}
      <section>
        <h3 className="text-sm font-medium text-cam-text mb-3">Resolucao de Sprites</h3>
        <div className="grid grid-cols-2 gap-2">
          {SPRITE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSpriteResolution(option.value)}
              className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                spriteResolution === option.value
                  ? 'border-cam-accent bg-cam-accent/10 ring-1 ring-cam-accent/30'
                  : 'border-cam-border hover:border-cam-border-hover bg-cam-surface-2'
              }`}
            >
              {/* Radio indicator */}
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                spriteResolution === option.value
                  ? 'border-cam-accent'
                  : 'border-cam-text-muted'
              }`}>
                {spriteResolution === option.value && (
                  <div className="w-2 h-2 rounded-full bg-cam-accent" />
                )}
              </div>
              <div>
                <span className={`text-xs font-medium ${
                  spriteResolution === option.value ? 'text-cam-accent' : 'text-cam-text-secondary'
                }`}>
                  {option.label}
                </span>
                <span className="text-[10px] text-cam-text-muted ml-1.5">
                  {option.description}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Sprite Preview */}
        <div className="mt-3">
          <SpritePreview resolution={spriteResolution} />
        </div>
      </section>
    </div>
  );
}
