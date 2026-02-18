import { useProjectStore } from "../../../stores/project-store";
import { useSessionStore } from "../../../stores/session-store";
import { TerminalStatsBar } from "./TerminalStatsBar";
import { TerminalAgentPanel } from "./TerminalAgentPanel";
import { TerminalActivityFeed } from "./TerminalActivityFeed";
import { TerminalAgentDetail } from "./TerminalAgentDetail";
import { TerminalFileWatcher } from "./TerminalFileWatcher";
import { TerminalKanban } from "./TerminalKanban";
import { TerminalSprintProgress } from "./TerminalSprintProgress";
import { TerminalBurndown } from "./TerminalBurndown";
import { TerminalPRDOverview } from "./TerminalPRDOverview";
import { TerminalDependencyGraph } from "./TerminalDependencyGraph";
import { TerminalProjectSelector } from "./TerminalProjectSelector";
import { SessionPicker } from "../../shared/SessionPicker";
import { AgentMap } from "../../agent-map/AgentMap";
import { TaskDetailPanel } from "../../shared/TaskDetailPanel";
import { AgentRightPanel } from "../../shared/AgentRightPanel.js";
import { InProcessWarning } from "../../shared/InProcessWarning.js";
import "./terminal.css";

function TerminalConnectionIndicator() {
  const { connectionStatus } = useSessionStore();

  const config = {
    connected: {
      className: "text-[#00ff00] terminal-glow",
      label: "[CONNECTED]",
      sublabel: "capturing events",
      sublabelClass: "text-[#00aa00]",
      showCursor: true,
    },
    reconnecting: {
      className: "text-[#ffaa00]",
      label: "[RECONNECTING...]",
      sublabel: "",
      sublabelClass: "",
      showCursor: false,
    },
    disconnected: {
      className: "terminal-error",
      label: "[DISCONNECTED]",
      sublabel: "waiting for server",
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
        </div>
      </header>

      {/* Stats Bar */}
      <TerminalStatsBar />

      {/* In-process mode warning */}
      <InProcessWarning />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === "agents" && <AgentsLayout />}
        {viewMode === "tracker" && <TrackerLayout />}
      </div>
    </div>
  );
}

function AgentsLayout() {
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

      {/* Right Panel - Activity Feed / FileWatcher or Agent Detail */}
      <aside className="w-72 border-l border-[#1a3a1a] terminal-scrollbar shrink-0">
        <AgentRightPanel
          AgentDetail={TerminalAgentDetail}
          ActivityFeed={TerminalActivityFeed}
          FileWatcher={TerminalFileWatcher}
          tabBarClass="flex border-b border-[#1a3a1a] bg-[#0d0d0d]"
          activeTabClass="text-[#00ff00] terminal-glow border-b-2 border-[#00ff00]"
          inactiveTabClass="text-[#00aa00]/60 hover:text-[#00aa00]"
        />
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
