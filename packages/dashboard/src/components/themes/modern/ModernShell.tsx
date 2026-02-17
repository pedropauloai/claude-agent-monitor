import { useProjectStore, type ViewMode } from "../../../stores/project-store";
import { useSessionStore } from "../../../stores/session-store";
import { ModernStatsBar } from "./ModernStatsBar";
import { ModernAgentPanel } from "./ModernAgentPanel";
import { ModernActivityFeed } from "./ModernActivityFeed";
import { ModernAgentDetail } from "./ModernAgentDetail";
import { ModernTimeline } from "./ModernTimeline";
import { ModernFileWatcher } from "./ModernFileWatcher";
import { ModernKanban } from "./ModernKanban";
import { ModernSprintProgress } from "./ModernSprintProgress";
import { ModernBurndown } from "./ModernBurndown";
import { ModernPRDOverview } from "./ModernPRDOverview";
import { ModernDependencyGraph } from "./ModernDependencyGraph";
import { ModernProjectSelector } from "./ModernProjectSelector";
import { SessionPicker } from "../../shared/SessionPicker";
import { useUIStore } from "../../../stores/ui-store.js";
import { useSettingsStore } from "../../../stores/settings-store.js";
import { AgentMap } from "../../agent-map/AgentMap";
import { TaskDetailPanel } from "../../shared/TaskDetailPanel";
import { HorizontalLayout, ResizablePanel, ResizeHandle, VerticalLayout } from "../../layout/ResizableLayout.js";
import "./modern.css";

function ConnectionIndicator() {
  const { connectionStatus } = useSessionStore();

  const config = {
    connected: {
      dotClass: "bg-cam-success animate-pulse-dot",
      textClass: "text-cam-success",
      label: "Conectado",
      sublabel: "capturando eventos",
    },
    reconnecting: {
      dotClass: "bg-amber-400 animate-pulse",
      textClass: "text-amber-400",
      label: "Reconectando...",
      sublabel: "",
    },
    disconnected: {
      dotClass: "bg-cam-error",
      textClass: "text-cam-error",
      label: "Desconectado",
      sublabel: "aguardando server",
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
          <GearButton />
        </div>
      </header>

      {/* Stats Bar */}
      <ModernStatsBar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === "map" && <MapLayout />}
        {viewMode === "monitor" && <MonitorLayout />}
        {viewMode === "tracker" && <TrackerLayout />}
        {viewMode === "mission-control" && <MissionControlLayout />}
      </div>

      {/* Bottom Timeline (conditional) */}
      <ConditionalTimeline />
    </div>
  );
}

function GearButton() {
  const openSettings = useUIStore((s) => s.openSettings);

  return (
    <button
      onClick={openSettings}
      className="p-1.5 rounded-lg text-cam-text-muted hover:text-cam-text hover:bg-cam-surface-2 transition-colors"
      title="Configurações (Ctrl+,)"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </button>
  );
}

function ConditionalTimeline() {
  const showTimeline = useSettingsStore((s) => s.showTimeline);
  if (!showTimeline) return null;
  return <ModernTimeline />;
}

function MapLayout() {
  const { selectedAgentId } = useSessionStore();
  const lockPanels = useSettingsStore((s) => s.lockPanels);

  return (
    <HorizontalLayout id="modern-map">
      <ResizablePanel defaultSize={15} minSize={10} maxSize={25} order={1}>
        <aside className="h-full overflow-y-auto modern-scrollbar">
          <ModernAgentPanel />
        </aside>
      </ResizablePanel>
      <ResizeHandle disabled={lockPanels} />
      <ResizablePanel defaultSize={55} minSize={30} order={2}>
        <main className="h-full overflow-hidden">
          <AgentMap />
        </main>
      </ResizablePanel>
      <ResizeHandle disabled={lockPanels} />
      <ResizablePanel defaultSize={30} minSize={15} maxSize={40} order={3}>
        <aside className="h-full overflow-y-auto modern-scrollbar">
          {selectedAgentId ? <ModernAgentDetail /> : <ModernActivityFeed />}
        </aside>
      </ResizablePanel>
    </HorizontalLayout>
  );
}

function MonitorLayout() {
  const { selectedAgentId } = useSessionStore();
  const lockPanels = useSettingsStore((s) => s.lockPanels);

  return (
    <HorizontalLayout id="modern-monitor">
      <ResizablePanel defaultSize={18} minSize={12} maxSize={30} order={1}>
        <aside className="h-full overflow-y-auto modern-scrollbar">
          <ModernAgentPanel />
        </aside>
      </ResizablePanel>
      <ResizeHandle disabled={lockPanels} />
      <ResizablePanel defaultSize={52} minSize={30} order={2}>
        <main className="h-full overflow-hidden flex flex-col">
          <ModernActivityFeed />
        </main>
      </ResizablePanel>
      <ResizeHandle disabled={lockPanels} />
      <ResizablePanel defaultSize={30} minSize={15} maxSize={40} order={3}>
        <aside className="h-full overflow-y-auto modern-scrollbar">
          {selectedAgentId ? <ModernAgentDetail /> : <ModernFileWatcher />}
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
        <HorizontalLayout id="modern-tracker-top">
          <ResizablePanel defaultSize={55} minSize={30} order={1}>
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
          <ResizablePanel defaultSize={25} minSize={15} maxSize={35} order={3}>
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

function MissionControlLayout() {
  const { selectedAgentId } = useSessionStore();
  const { selectedTaskId } = useProjectStore();
  const lockPanels = useSettingsStore((s) => s.lockPanels);

  return (
    <HorizontalLayout id="modern-mission">
      <ResizablePanel defaultSize={50} minSize={30} maxSize={70} order={1}>
        <HorizontalLayout id="modern-mission-left">
          <ResizablePanel defaultSize={30} minSize={15} maxSize={40} order={1}>
            <aside className="h-full overflow-y-auto modern-scrollbar">
              <ModernAgentPanel />
            </aside>
          </ResizablePanel>
          <ResizeHandle disabled={lockPanels} />
          <ResizablePanel defaultSize={70} minSize={40} order={2}>
            <div className="h-full flex flex-col overflow-hidden">
              <div className="flex-1 overflow-hidden">
                <ModernActivityFeed />
              </div>
            </div>
          </ResizablePanel>
        </HorizontalLayout>
      </ResizablePanel>
      <ResizeHandle disabled={lockPanels} />
      <ResizablePanel defaultSize={50} minSize={30} maxSize={70} order={2}>
        <VerticalLayout id="modern-mission-right">
          <ResizablePanel defaultSize={70} minSize={40} order={1}>
            <div className="h-full overflow-hidden flex">
              <div className="flex-1 overflow-hidden">
                <ModernKanban />
              </div>
              {selectedTaskId && (
                <aside className="w-72 border-l border-cam-border/50 overflow-y-auto modern-scrollbar shrink-0">
                  <TaskDetailPanel />
                </aside>
              )}
            </div>
          </ResizablePanel>
          <ResizeHandle direction="vertical" disabled={lockPanels} />
          <ResizablePanel defaultSize={30} minSize={15} maxSize={45} order={2}>
            <div className="h-full flex">
              <div className="flex-1">
                <ModernSprintProgress />
              </div>
              <div className="w-64 border-l border-cam-border/50">
                <ModernBurndown />
              </div>
            </div>
          </ResizablePanel>
        </VerticalLayout>
      </ResizablePanel>
    </HorizontalLayout>
  );
}
