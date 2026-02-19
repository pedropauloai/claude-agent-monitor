import { useProjectStore } from "../../../stores/project-store";
import { useSessionStore } from "../../../stores/session-store";
import { ModernStatsBar } from "./ModernStatsBar";
import { ModernAgentPanel } from "./ModernAgentPanel";
import { ModernActivityFeed } from "./ModernActivityFeed";
import { ModernAgentDetail } from "./ModernAgentDetail";
import { ModernFileWatcher } from "./ModernFileWatcher";
import { ModernKanban } from "./ModernKanban";
import { ModernSprintProgress } from "./ModernSprintProgress";
import { ModernBurndown } from "./ModernBurndown";
import { ModernPRDOverview } from "./ModernPRDOverview";
import { ModernDependencyGraph } from "./ModernDependencyGraph";
import { ModernProjectSelector } from "./ModernProjectSelector";
import { SessionPicker } from "../../shared/SessionPicker";
import { useSettingsStore } from "../../../stores/settings-store.js";
import { AgentMap3D } from "../../agent-map-3d/AgentMap3D.js";
import { TaskDetailPanel } from "../../shared/TaskDetailPanel";
import { HorizontalLayout, ResizablePanel, ResizeHandle, VerticalLayout } from "../../layout/ResizableLayout.js";
import { AgentRightPanel } from "../../shared/AgentRightPanel.js";
import { InProcessWarning } from "../../shared/InProcessWarning.js";
import "./modern.css";

function ConnectionIndicator() {
  const { connectionStatus, session } = useSessionStore();

  // If session is completed/error, show session status instead of connection status
  if (session && session.status !== 'active') {
    const isError = session.status === 'error';
    return (
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${isError ? 'bg-cam-error' : 'bg-gray-400'}`} />
        <span className={`text-xs ${isError ? 'text-cam-error' : 'text-cam-text-muted'}`}>
          {isError ? 'Session error' : 'Session ended'}
        </span>
      </div>
    );
  }

  const config = {
    connected: {
      dotClass: "bg-cam-success animate-pulse-dot",
      textClass: "text-cam-success",
      label: "Connected",
      sublabel: "capturing events",
    },
    reconnecting: {
      dotClass: "bg-amber-400 animate-pulse",
      textClass: "text-amber-400",
      label: "Reconnecting...",
      sublabel: "",
    },
    disconnected: {
      dotClass: "bg-cam-error",
      textClass: "text-cam-error",
      label: "Disconnected",
      sublabel: "waiting for server",
    },
  }[connectionStatus];

  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${config.dotClass}`} />
      <span className={`text-xs ${config.textClass}`}>{config.label}</span>
      {config.sublabel && (
        <span className="text-xs text-cam-text-muted">- {config.sublabel}</span>
      )}
    </div>
  );
}

export function ModernShell() {
  const { viewMode } = useProjectStore();

  return (
    <div className="h-full w-full flex flex-col modern-gradient-bg overflow-hidden">
      {/* Top Bar */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-cam-border/50 modern-glass shrink-0 relative z-50">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-cam-text tracking-tight">
            Claude Agent Monitor
          </h1>
          <ConnectionIndicator />
        </div>

        <div className="flex items-center gap-3">
          <SessionPicker />
          <ModernProjectSelector />
        </div>
      </header>

      {/* Stats Bar */}
      <ModernStatsBar />

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
  const lockPanels = useSettingsStore((s) => s.lockPanels);

  return (
    <HorizontalLayout id="modern-agents">
      <ResizablePanel defaultSize={20} minSize={10} maxSize={25} order={1}>
        <aside className="h-full overflow-y-auto modern-scrollbar">
          <ModernAgentPanel />
        </aside>
      </ResizablePanel>
      <ResizeHandle disabled={lockPanels} />
      <ResizablePanel defaultSize={55} minSize={30} maxSize={75} order={2}>
        <main className="h-full overflow-hidden">
          <AgentMap3D />
        </main>
      </ResizablePanel>
      <ResizeHandle disabled={lockPanels} />
      <ResizablePanel defaultSize={25} minSize={15} maxSize={40} order={3}>
        <aside className="h-full modern-scrollbar">
          <AgentRightPanel
            AgentDetail={ModernAgentDetail}
            ActivityFeed={ModernActivityFeed}
            FileWatcher={ModernFileWatcher}
          />
        </aside>
      </ResizablePanel>
    </HorizontalLayout>
  );
}

function TrackerLayout() {
  const { selectedTaskId } = useProjectStore();
  const lockPanels = useSettingsStore((s) => s.lockPanels);

  return (
    <VerticalLayout id="modern-tracker">
      <ResizablePanel defaultSize={75} minSize={50} order={1}>
        <HorizontalLayout id={selectedTaskId ? "modern-tracker-top-detail" : "modern-tracker-top"}>
          <ResizablePanel defaultSize={selectedTaskId ? 55 : 70} minSize={30} order={1}>
            <main className="h-full overflow-hidden">
              <ModernKanban />
            </main>
          </ResizablePanel>
          {selectedTaskId && (
            <>
              <ResizeHandle disabled={lockPanels} />
              <ResizablePanel defaultSize={20} minSize={15} maxSize={35} order={2}>
                <aside className="h-full overflow-y-auto modern-scrollbar">
                  <TaskDetailPanel />
                </aside>
              </ResizablePanel>
            </>
          )}
          <ResizeHandle disabled={lockPanels} />
          <ResizablePanel defaultSize={selectedTaskId ? 25 : 30} minSize={15} maxSize={40} order={3}>
            <aside className="h-full overflow-y-auto modern-scrollbar flex flex-col">
              <ModernSprintProgress />
              <ModernBurndown />
              <ModernDependencyGraph />
            </aside>
          </ResizablePanel>
        </HorizontalLayout>
      </ResizablePanel>
      <ResizeHandle direction="vertical" disabled={lockPanels} />
      <ResizablePanel defaultSize={25} minSize={10} maxSize={40} order={2}>
        <div className="h-full overflow-y-auto modern-scrollbar">
          <ModernPRDOverview />
        </div>
      </ResizablePanel>
    </VerticalLayout>
  );
}
