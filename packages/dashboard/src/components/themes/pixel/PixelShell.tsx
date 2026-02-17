import { useProjectStore, type ViewMode } from "../../../stores/project-store";
import { useSessionStore } from "../../../stores/session-store";
import { PixelStatsBar } from "./PixelStatsBar";
import { PixelAgentPanel } from "./PixelAgentPanel";
import { PixelActivityFeed } from "./PixelActivityFeed";
import { PixelAgentDetail } from "./PixelAgentDetail";
import { PixelTimeline } from "./PixelTimeline";
import { PixelFileWatcher } from "./PixelFileWatcher";
import { PixelKanban } from "./PixelKanban";
import { PixelSprintProgress } from "./PixelSprintProgress";
import { PixelBurndown } from "./PixelBurndown";
import { PixelPRDOverview } from "./PixelPRDOverview";
import { PixelDependencyGraph } from "./PixelDependencyGraph";
import { PixelProjectSelector } from "./PixelProjectSelector";
import { SessionPicker } from "../../shared/SessionPicker";
import { useUIStore } from "../../../stores/ui-store.js";
import { useSettingsStore } from "../../../stores/settings-store.js";
import { AgentMap } from "../../agent-map/AgentMap";
import { TaskDetailPanel } from "../../shared/TaskDetailPanel";
import "./pixel.css";

function PixelConnectionIndicator() {
  const { connectionStatus } = useSessionStore();

  const config = {
    connected: {
      color: "var(--pixel-green)",
      glow: "0 0 6px var(--pixel-green)",
      pulse: true,
      label: "ONLINE",
    },
    reconnecting: {
      color: "var(--pixel-gold)",
      glow: "0 0 6px var(--pixel-gold)",
      pulse: true,
      label: "RECONECTANDO...",
    },
    disconnected: {
      color: "var(--pixel-error)",
      glow: "0 0 6px var(--pixel-error)",
      pulse: false,
      label: "OFFLINE",
    },
  }[connectionStatus];

  return (
    <div className="flex items-center gap-2 ml-2">
      <div
        className={`w-3 h-3 ${config.pulse ? "pixel-pulse" : ""}`}
        style={{
          background: config.color,
          boxShadow: config.glow,
        }}
      />
      <span className="pixel-text-xs" style={{ color: config.color }}>
        {config.label}
      </span>
    </div>
  );
}

export function PixelShell() {
  const { viewMode } = useProjectStore();

  return (
    <div
      className="pixel-theme h-full w-full flex flex-col overflow-hidden"
      style={{ background: "var(--pixel-bg)" }}
    >
      {/* HUD Top Bar */}
      <header className="h-14 flex items-center justify-between px-4 pixel-hud shrink-0 relative z-50">
        <div className="flex items-center gap-4">
          <h1 className="pixel-text-lg" style={{ color: "var(--pixel-gold)" }}>
            CAM
          </h1>
          <span
            className="pixel-text-xs"
            style={{ color: "var(--pixel-text-muted)" }}
          >
            CLAUDE AGENT MONITOR
          </span>
          <PixelConnectionIndicator />
        </div>

        <div className="flex items-center gap-3">
          <SessionPicker />
          <PixelProjectSelector />
          <PixelGearButton />
        </div>
      </header>

      {/* Stats HUD */}
      <PixelStatsBar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === "map" && <MapLayout />}
        {viewMode === "monitor" && <MonitorLayout />}
        {viewMode === "tracker" && <TrackerLayout />}
        {viewMode === "mission-control" && <MissionControlLayout />}
      </div>

      {/* Bottom Timeline (conditional) */}
      <PixelConditionalTimeline />
    </div>
  );
}

function PixelGearButton() {
  const openSettings = useUIStore((s) => s.openSettings);

  return (
    <button
      onClick={openSettings}
      className="pixel-text-xs px-2 py-1 transition-colors"
      style={{
        color: 'var(--pixel-text-muted)',
        border: '2px solid var(--pixel-border)',
      }}
      title="Configurações (Ctrl+,)"
      onMouseEnter={(e) => {
        (e.target as HTMLElement).style.color = 'var(--pixel-gold)';
        (e.target as HTMLElement).style.borderColor = 'var(--pixel-gold)';
      }}
      onMouseLeave={(e) => {
        (e.target as HTMLElement).style.color = 'var(--pixel-text-muted)';
        (e.target as HTMLElement).style.borderColor = 'var(--pixel-border)';
      }}
    >
      [CFG]
    </button>
  );
}

function PixelConditionalTimeline() {
  const showTimeline = useSettingsStore((s) => s.showTimeline);
  if (!showTimeline) return null;
  return <PixelTimeline />;
}

function MapLayout() {
  const { selectedAgentId } = useSessionStore();

  return (
    <>
      {/* Left Sidebar - Party Panel */}
      <aside
        className="w-48 overflow-y-auto pixel-scrollbar shrink-0"
        style={{ borderRight: "3px solid var(--pixel-border)" }}
      >
        <PixelAgentPanel />
      </aside>

      {/* Center - Agent Map */}
      <main className="flex-1 overflow-hidden">
        <AgentMap />
      </main>

      {/* Right Panel - Battle Log or Character Sheet */}
      <aside
        className="w-72 overflow-y-auto pixel-scrollbar shrink-0"
        style={{ borderLeft: "3px solid var(--pixel-border)" }}
      >
        {selectedAgentId ? <PixelAgentDetail /> : <PixelActivityFeed />}
      </aside>
    </>
  );
}

function MonitorLayout() {
  const { selectedAgentId } = useSessionStore();

  return (
    <>
      {/* Left Sidebar - Party Panel */}
      <aside
        className="w-60 overflow-y-auto pixel-scrollbar shrink-0"
        style={{ borderRight: "3px solid var(--pixel-border)" }}
      >
        <PixelAgentPanel />
      </aside>

      {/* Center - Battle Log */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <PixelActivityFeed />
      </main>

      {/* Right Panel - Character Sheet or Inventory */}
      <aside
        className="w-72 overflow-y-auto pixel-scrollbar shrink-0"
        style={{ borderLeft: "3px solid var(--pixel-border)" }}
      >
        {selectedAgentId ? <PixelAgentDetail /> : <PixelFileWatcher />}
      </aside>
    </>
  );
}

function TrackerLayout() {
  const { selectedTaskId } = useProjectStore();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Main Quest Board */}
        <main className="flex-1 overflow-hidden">
          <PixelKanban />
        </main>

        {/* Task Detail Panel */}
        {selectedTaskId && (
          <aside
            className="w-80 overflow-y-auto pixel-scrollbar shrink-0"
            style={{ borderLeft: "3px solid var(--pixel-border)" }}
          >
            <TaskDetailPanel />
          </aside>
        )}

        {/* Right sidebar - Chapter Progress + XP Chart */}
        <aside
          className="w-80 overflow-y-auto pixel-scrollbar shrink-0 flex flex-col"
          style={{ borderLeft: "3px solid var(--pixel-border)" }}
        >
          <PixelSprintProgress />
          <PixelBurndown />
          <PixelDependencyGraph />
        </aside>
      </div>

      {/* Bottom - Quest Journal */}
      <div
        className="h-48 overflow-y-auto pixel-scrollbar shrink-0"
        style={{ borderTop: "3px solid var(--pixel-border)" }}
      >
        <PixelPRDOverview />
      </div>
    </div>
  );
}

function MissionControlLayout() {
  const { selectedAgentId } = useSessionStore();
  const { selectedTaskId } = useProjectStore();

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left - Party Monitor */}
      <div
        className="w-1/2 flex overflow-hidden"
        style={{ borderRight: "3px solid var(--pixel-border)" }}
      >
        <aside
          className="w-48 overflow-y-auto pixel-scrollbar shrink-0"
          style={{ borderRight: "3px solid var(--pixel-border)" }}
        >
          <PixelAgentPanel />
        </aside>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <PixelActivityFeed />
          </div>
        </div>
      </div>

      {/* Right - Quest Board */}
      <div className="w-1/2 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden flex">
          <main className="flex-1 overflow-hidden">
            <PixelKanban />
          </main>
          {selectedTaskId && (
            <aside
              className="w-80 overflow-y-auto pixel-scrollbar shrink-0"
              style={{ borderLeft: "3px solid var(--pixel-border)" }}
            >
              <TaskDetailPanel />
            </aside>
          )}
        </div>
        <div
          className="h-32 flex shrink-0"
          style={{ borderTop: "3px solid var(--pixel-border)" }}
        >
          <div className="flex-1">
            <PixelSprintProgress />
          </div>
          <div
            className="w-64"
            style={{ borderLeft: "3px solid var(--pixel-border)" }}
          >
            <PixelBurndown />
          </div>
        </div>
      </div>
    </div>
  );
}
