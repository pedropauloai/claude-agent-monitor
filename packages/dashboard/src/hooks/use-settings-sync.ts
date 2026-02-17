import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settings-store.js';
import { useThemeStore } from '../stores/theme-store.js';
import { useSessionStore } from '../stores/session-store.js';
import { useAgentMapStore } from '../stores/agent-map-store.js';

/**
 * useSettingsSync - Sincroniza os valores do useSettingsStore unificado
 * para as stores legadas (theme-store, session-store, agent-map-store),
 * garantindo que componentes existentes continuem funcionando sem mudancas.
 *
 * Deve ser chamado uma unica vez no App.tsx.
 */
export function useSettingsSync() {
  const theme = useSettingsStore((s) => s.theme);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const activityWindow = useSettingsStore((s) => s.activityWindow);
  const showLabels = useSettingsStore((s) => s.showLabels);
  const showInteractions = useSettingsStore((s) => s.showInteractions);
  const displayMode = useSettingsStore((s) => s.displayMode);

  // Sync theme settings to theme-store
  useEffect(() => {
    const ts = useThemeStore.getState();
    if (ts.theme !== theme) ts.setTheme(theme);
    if (ts.accentColor !== accentColor) ts.setAccentColor(accentColor);
  }, [theme, accentColor]);

  // Sync activity window to session-store
  useEffect(() => {
    const ss = useSessionStore.getState();
    if (ss.activityWindow !== activityWindow) ss.setActivityWindow(activityWindow);
  }, [activityWindow]);

  // Sync agent map settings to agent-map-store
  useEffect(() => {
    const ams = useAgentMapStore.getState();
    if (ams.showLabels !== showLabels) {
      ams.toggleLabels();
    }
    if (ams.showInteractions !== showInteractions) {
      ams.toggleInteractions();
    }
    if (ams.displayMode !== displayMode) {
      ams.setDisplayMode(displayMode);
    }
  }, [showLabels, showInteractions, displayMode]);
}
