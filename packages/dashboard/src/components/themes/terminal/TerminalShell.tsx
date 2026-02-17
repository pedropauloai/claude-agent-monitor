import { useProjectStore, type ViewMode } from "../../../stores/project-store";
import { useSessionStore } from "../../../stores/session-store";
import { TerminalStatsBar } from "./TerminalStatsBar";
import { TerminalAgentPanel } from "./TerminalAgentPanel";
import { TerminalActivityFeed } from "./TerminalActivityFeed";
import { TerminalAgentDetail } from "./TerminalAgentDetail";
import { TerminalTimeline } from "./TerminalTimeline";
import { TerminalFileWatcher } from "./TerminalFileWatcher";
import { TerminalKanban } from "./TerminalKanban";
import { TerminalSprintProgress } from "./TerminalSprintProgress";
import { TerminalBurndown } from "./TerminalBurndown";
import { TerminalPRDOverview } from "./TerminalPRDOverview";
import { TerminalDependencyGraph } from "./TerminalDependencyGraph";
import { TerminalProjectSelector } from "./TerminalProjectSelector";
import { SessionPicker } from "../../shared/SessionPicker";
import { useUIStore } from "../../../stores/ui-store.js";
import { useSettingsStore } from "../../../stores/settings-store.js";
import { AgentMap } from "../../agent-map/AgentMap";
import { TaskDetailPanel } from "../../shared/TaskDetailPanel";
import "./terminal.css";

function TerminalConnectionIndicator() {
  const { connectionStatus } = useSessionStore();

  const config = {
    connected: {
      className: "text-[#00ff00] terminal-glow",
      label: "[CONECTADO]",
      sublabel: "capturando eventos",
      sublabelClass: "text-[#00aa00]",
      showCursor: true,
    },
    reconnecting: {
      className: "text-[#ffaa00]",
      label: "[RECONECTANDO...]",
      sublabel: "",
      sublabelClass: "",
      showCursor: false,
    },
    disconnected: {
      className: "terminal-error",
      label: "[DESCONECTADO]",
      sublabel: "aguardando server",
      sublabelClass: "terminal-error",
      showCursor: false,
    },
  }[connectionStatus];

  return (
    <div className="flex items-center gap-1">
      <span className={config.className}>{config.label}</span>
      {config.sublabel && (
        <span className={config.sublabelClass}>{config.sublabel}</span>
      )}
      {config.showCursor && <span className="terminal-cursor-active" />}
    </div>
  );
}

export function TerminalShell() {
  const { viewMode } = useProjectStore();

  return (
    <div className="h-full w-full flex flex-col terminal-bg terminal-boot overflow-hidden">
      {/* Top Bar - terminal header */}
      <header className="h-10 flex items-center justify-between px-3 border-b border-[#1a3a1a] bg-[#0d0d0d] shrink-0 font-mono text-[11px] relative z-50">
        <div className="flex items-center gap-3">
          <span className="text-[#00ff00] terminal-glow font-bold">
            {"CAM://"}
          </span>
          <span className="text-[#00aa00]">Claude Agent Monitor</span>
          <span className="terminal-dim">|</span>
          <TerminalConnectionIndicator />
        </div>

        <div className="flex items-center gap-3">
          <SessionPicker />
          <TerminalProjectSelector />
          <TerminalGearButton />
        </div>
      </header>

      {/* Stats Bar */}
      <TerminalStatsBar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === "map" && <MapLayout />}
        {viewMode === "monitor" && <MonitorLayout />}
        {viewMode === "tracker" && <TrackerLayout />}
        {viewMode === "mission-control" && <MissionControlLayout />}
      </div>

      {/* Bottom Timeline (conditional) */}
      <TerminalConditionalTimeline />
    </div>
  );
}

function TerminalGearButton() {
  const openSettings = useUIStore((s) => s.openSettings);

  return (
    <button
      onClick={openSettings}
      className="font-mono text-[11px] terminal-muted hover:text-[#00ff00] hover:terminal-glow transition-colors"
      title="Configurações (Ctrl+,)"
    >
      [CONFIG]
    </button>
  );
}

function TerminalConditionalTimeline() {
  const showTimeline = useSettingsStore((s) => s.showTimeline);
  if (!showTimeline) return null;
  return <TerminalTimeline />;
}

function MapLayout() {
  const { selectedAgentId } = useSessionStore();

  return (
    <>
      {/* Left Sidebar - Agent Panel */}
      <aside className="w-48 border-r border-[#1a3a1a] overflow-y-auto terminal-scrollbar shrink-0">
        <TerminalAgentPanel />
      </aside>

      {/* Center - Agent Map */}
      <main className="flex-1 overflow-hidden">
        <AgentMap />
      </main>

      {/* Right Panel - Activity Feed or Agent Detail */}
      <aside className="w-72 border-l border-[#1a3a1a] overflow-y-auto terminal-scrollbar shrink-0">
        {selectedAgentId ? <TerminalAgentDetail /> : <TerminalActivityFeed />}
      </aside>
    </>
  );
}

function MonitorLayout() {
  const { selectedAgentId } = useSessionStore();

  return (
    <>
      {/* Left Sidebar - Agent Panel */}
      <aside className="w-56 border-r border-[#1a3a1a] overflow-y-auto terminal-scrollbar shrink-0">
        <TerminalAgentPanel />
      </aside>

      {/* Center - Activity Feed */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <TerminalActivityFeed />
      </main>

      {/* Right Panel - Agent Detail or File Watcher */}
      <aside className="w-72 border-l border-[#1a3a1a] overflow-y-auto terminal-scrollbar shrink-0">
        {selectedAgentId ? <TerminalAgentDetail /> : <TerminalFileWatcher />}
      </aside>
    </>
  );
}

function TrackerLayout() {
  const { selectedTaskId } = useProjectStore();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Main Kanban */}
        <main className="flex-1 overflow-hidden">
          <TerminalKanban />
        </main>

        {/* Task Detail Panel */}
        {selectedTaskId && (
          <aside className="w-80 border-l border-[#1a3a1a] overflow-y-auto terminal-scrollbar shrink-0">
            <TaskDetailPanel />
          </aside>
        )}

        {/* Right sidebar - Sprint Progress + Burndown */}
        <aside className="w-80 border-l border-[#1a3a1a] overflow-y-auto terminal-scrollbar shrink-0 flex flex-col">
          <TerminalSprintProgress />
          <TerminalBurndown />
          <TerminalDependencyGraph />
        </aside>
      </div>

      {/* Bottom - PRD Overview */}
      <div className="h-48 border-t border-[#1a3a1a] overflow-y-auto terminal-scrollbar shrink-0">
        <TerminalPRDOverview />
      </div>
    </div>
  );
}

function MissionControlLayout() {
  const { selectedAgentId } = useSessionStore();
  const { selectedTaskId } = useProjectStore();

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left - Agent Monitor */}
      <div className="w-1/2 flex border-r border-[#1a3a1a] overflow-hidden">
        <aside className="w-48 border-r border-[#1a3a1a] overflow-y-auto terminal-scrollbar shrink-0">
          <TerminalAgentPanel />
        </aside>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <TerminalActivityFeed />
          </div>
        </div>
      </div>

      {/* Right - PRD Tracker */}
      <div className="w-1/2 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden flex">
          <main className="flex-1 overflow-hidden">
            <TerminalKanban />
          </main>
          {selectedTaskId && (
            <aside className="w-80 border-l border-[#1a3a1a] overflow-y-auto terminal-scrollbar shrink-0">
              <TaskDetailPanel />
            </aside>
          )}
        </div>
        <div className="h-32 border-t border-[#1a3a1a] flex shrink-0">
          <div className="flex-1">
            <TerminalSprintProgress />
          </div>
          <div className="w-64 border-l border-[#1a3a1a]">
            <TerminalBurndown />
          </div>
        </div>
      </div>
    </div>
  );
}
