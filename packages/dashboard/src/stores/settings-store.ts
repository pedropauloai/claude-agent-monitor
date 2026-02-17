import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SpriteResolution = '16x16' | '24x24' | '32x32' | '48x48';
export type DisplayMode = 'technical' | 'didactic';
export type ThemeName = 'modern' | 'pixel' | 'terminal';

interface SettingsDefaults {
  theme: ThemeName;
  accentColor: string;
  followMode: boolean;
  hidePolling: boolean;
  pollingTools: string[];
  groupRepetitive: boolean;
  activityWindow: number;
  showLabels: boolean;
  showInteractions: boolean;
  displayMode: DisplayMode;
  speechBubbleTimeout: number;
  maxEvents: number;
  maxCommunicationLines: number;
  lockPanels: boolean;
  spriteResolution: SpriteResolution;
  showTimeline: boolean;
}

const DEFAULTS: SettingsDefaults = {
  theme: 'modern',
  accentColor: '#3b82f6',
  followMode: true,
  hidePolling: false,
  pollingTools: ['TaskList', 'TaskGet'],
  groupRepetitive: false,
  activityWindow: 300_000,
  showLabels: true,
  showInteractions: true,
  displayMode: 'technical',
  speechBubbleTimeout: 5,
  maxEvents: 500,
  maxCommunicationLines: 5,
  lockPanels: false,
  spriteResolution: '24x24',
  showTimeline: true,
};

interface SettingsState extends SettingsDefaults {
  // Individual setters
  setTheme: (theme: ThemeName) => void;
  setAccentColor: (color: string) => void;
  setFollowMode: (value: boolean) => void;
  setHidePolling: (value: boolean) => void;
  setPollingTools: (tools: string[]) => void;
  setGroupRepetitive: (value: boolean) => void;
  setActivityWindow: (ms: number) => void;
  setShowLabels: (value: boolean) => void;
  setShowInteractions: (value: boolean) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  setSpeechBubbleTimeout: (seconds: number) => void;
  setMaxEvents: (max: number) => void;
  setMaxCommunicationLines: (max: number) => void;
  setLockPanels: (value: boolean) => void;
  setSpriteResolution: (res: SpriteResolution) => void;
  setShowTimeline: (value: boolean) => void;

  // Toggles
  toggleFollowMode: () => void;
  toggleHidePolling: () => void;
  toggleGroupRepetitive: () => void;
  toggleLabels: () => void;
  toggleInteractions: () => void;
  toggleLockPanels: () => void;
  toggleTimeline: () => void;

  // Polling tools management
  addPollingTool: (tool: string) => void;
  removePollingTool: (tool: string) => void;

  // Reset
  resetToDefaults: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Default values
      ...DEFAULTS,

      // Individual setters
      setTheme: (theme) => set({ theme }),
      setAccentColor: (accentColor) => set({ accentColor }),
      setFollowMode: (followMode) => set({ followMode }),
      setHidePolling: (hidePolling) => set({ hidePolling }),
      setPollingTools: (pollingTools) => set({ pollingTools }),
      setGroupRepetitive: (groupRepetitive) => set({ groupRepetitive }),
      setActivityWindow: (activityWindow) => set({ activityWindow }),
      setShowLabels: (showLabels) => set({ showLabels }),
      setShowInteractions: (showInteractions) => set({ showInteractions }),
      setDisplayMode: (displayMode) => set({ displayMode }),
      setSpeechBubbleTimeout: (speechBubbleTimeout) => set({ speechBubbleTimeout }),
      setMaxEvents: (maxEvents) => set({ maxEvents }),
      setMaxCommunicationLines: (maxCommunicationLines) => set({ maxCommunicationLines }),
      setLockPanels: (lockPanels) => set({ lockPanels }),
      setSpriteResolution: (spriteResolution) => set({ spriteResolution }),
      setShowTimeline: (showTimeline) => set({ showTimeline }),

      // Toggles
      toggleFollowMode: () => set((state) => ({ followMode: !state.followMode })),
      toggleHidePolling: () => set((state) => ({ hidePolling: !state.hidePolling })),
      toggleGroupRepetitive: () => set((state) => ({ groupRepetitive: !state.groupRepetitive })),
      toggleLabels: () => set((state) => ({ showLabels: !state.showLabels })),
      toggleInteractions: () => set((state) => ({ showInteractions: !state.showInteractions })),
      toggleLockPanels: () => set((state) => ({ lockPanels: !state.lockPanels })),
      toggleTimeline: () => set((state) => ({ showTimeline: !state.showTimeline })),

      // Polling tools management
      addPollingTool: (tool) =>
        set((state) => {
          if (state.pollingTools.includes(tool)) return state;
          return { pollingTools: [...state.pollingTools, tool] };
        }),
      removePollingTool: (tool) =>
        set((state) => ({
          pollingTools: state.pollingTools.filter((t) => t !== tool),
        })),

      // Reset all settings to defaults
      resetToDefaults: () => set({ ...DEFAULTS }),
    }),
    {
      name: 'cam-settings',
    }
  )
);
