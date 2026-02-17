import { useMemo } from "react";
import { useThemeStore } from "../../stores/theme-store";
import { useSessionStore } from "../../stores/session-store";
import { useUIStore } from "../../stores/ui-store.js";
import { useSettingsStore } from "../../stores/settings-store.js";
import { ModernShell } from "../themes/modern/ModernShell";
import { TerminalShell } from "../themes/terminal/TerminalShell";
import { PixelShell } from "../themes/pixel/PixelShell";
import { EmptyState } from "../shared/EmptyState";
import { ProjectSidebar } from "../sidebar/ProjectSidebar.js";
import { SettingsModal } from "../settings/SettingsModal.js";
import { useKeyboardShortcuts } from "../../hooks/use-keyboard-shortcuts.js";

export function Shell() {
  const { theme } = useThemeStore();
  const session = useSessionStore((s) => s.session);
  const events = useSessionStore((s) => s.events);
  const toggleLockPanels = useSettingsStore((s) => s.toggleLockPanels);

  const {
    settingsOpen,
    sidebarCollapsed,
    closeSettings,
    toggleSettings,
    toggleSidebar,
    openSettings,
  } = useUIStore();

  const shortcuts = useMemo(
    () => [
      {
        key: ",",
        ctrl: true,
        handler: toggleSettings,
        description: "Toggle settings modal",
      },
      {
        key: "l",
        ctrl: true,
        handler: toggleLockPanels,
        description: "Toggle panel lock",
      },
      {
        key: "b",
        ctrl: true,
        handler: toggleSidebar,
        description: "Toggle sidebar",
      },
    ],
    [toggleLockPanels, toggleSettings, toggleSidebar]
  );

  useKeyboardShortcuts(shortcuts);

  // Show empty/onboarding state when no session and no events
  if (!session && events.length === 0) {
    return <EmptyState />;
  }

  const themeShell = (() => {
    switch (theme) {
      case "terminal":
        return <TerminalShell />;
      case "pixel":
        return <PixelShell />;
      case "modern":
      default:
        return <ModernShell />;
    }
  })();

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <ProjectSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        onOpenSettings={openSettings}
      />
      <div className="flex-1 overflow-hidden">
        {themeShell}
      </div>
      <SettingsModal isOpen={settingsOpen} onClose={closeSettings} />
    </div>
  );
}
