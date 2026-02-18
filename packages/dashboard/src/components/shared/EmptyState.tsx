import { useSessionStore } from "../../stores/session-store";
import { useThemeStore } from "../../stores/theme-store";
import { ThemeSwitcher } from "../layout/ThemeSwitcher";

function ModernEmptyState() {
  const { connectionStatus } = useSessionStore();

  return (
    <div className="h-screen w-screen flex flex-col modern-gradient-bg">
      <header className="h-12 flex items-center justify-between px-4 border-b border-cam-border/50 modern-glass shrink-0">
        <h1 className="text-sm font-semibold text-cam-text tracking-tight">
          Claude Agent Monitor
        </h1>
        <ThemeSwitcher />
      </header>

      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 rounded-2xl bg-cam-surface-2 border border-cam-border flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">
              {connectionStatus === "connected" ? "\u{1F4E1}" : "\u{1F50C}"}
            </span>
          </div>

          <h2 className="text-xl font-semibold text-cam-text mb-2">
            Waiting for connection...
          </h2>
          <p className="text-sm text-cam-text-muted mb-8">
            {connectionStatus === "connected"
              ? "Server connected. Start Claude Code in another terminal to see activity."
              : "No active session detected. Follow the steps below to get started."}
          </p>

          <div className="text-left space-y-4">
            <Step number={1} title="Configure hooks in your project">
              <code className="text-xs bg-cam-surface-2 px-2 py-1 rounded text-cam-accent font-mono">
                cam init
              </code>
            </Step>
            <Step number={2} title="Start Claude Code in another terminal">
              <code className="text-xs bg-cam-surface-2 px-2 py-1 rounded text-cam-accent font-mono">
                claude &quot;your task here&quot;
              </code>
            </Step>
            <Step number={3} title="Watch agents working">
              <span className="text-xs text-cam-text-muted">
                Events will appear automatically on the dashboard.
              </span>
            </Step>
          </div>

          {connectionStatus === "reconnecting" && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs text-amber-400">
                Reconnecting to server...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-cam-accent/20 border border-cam-accent/40 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-xs font-bold text-cam-accent">{number}</span>
      </div>
      <div>
        <p className="text-sm text-cam-text font-medium">{title}</p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}

function PixelEmptyState() {
  const { connectionStatus } = useSessionStore();

  return (
    <div
      className="pixel-theme h-screen w-screen flex flex-col"
      style={{ background: "var(--pixel-bg)" }}
    >
      <header className="h-14 flex items-center justify-between px-4 pixel-hud shrink-0">
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
        </div>
        <ThemeSwitcher />
      </header>

      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div
            className="pixel-text-lg mb-2"
            style={{ color: "var(--pixel-gold)", fontSize: "24px" }}
          >
            {"> WAITING FOR CONNECTION..."}
          </div>
          <p
            className="pixel-text-xs mb-8"
            style={{ color: "var(--pixel-text-muted)" }}
          >
            {connectionStatus === "connected"
              ? "SERVER ONLINE. START CLAUDE CODE IN ANOTHER TERMINAL."
              : "NO ACTIVE SESSION. FOLLOW THE STEPS BELOW."}
          </p>

          <div
            className="text-left space-y-3 mx-auto"
            style={{
              border: "2px solid var(--pixel-border)",
              background: "var(--pixel-panel)",
              padding: "12px 16px",
              maxWidth: "380px",
            }}
          >
            <div
              className="pixel-text-xs"
              style={{ color: "var(--pixel-gold)" }}
            >
              {"== QUEST LOG =="}
            </div>
            <div
              className="pixel-text-xs"
              style={{ color: "var(--pixel-green)" }}
            >
              {"[1] Run: cam init"}
            </div>
            <div
              className="pixel-text-xs"
              style={{ color: "var(--pixel-green)" }}
            >
              {'[2] Run: claude "your task"'}
            </div>
            <div
              className="pixel-text-xs"
              style={{ color: "var(--pixel-green)" }}
            >
              {"[3] Watch agents on dashboard"}
            </div>
          </div>

          {connectionStatus === "reconnecting" && (
            <div className="mt-4">
              <span
                className="pixel-text-xs pixel-pulse"
                style={{ color: "var(--pixel-gold)" }}
              >
                {"RECONNECTING..."}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TerminalEmptyState() {
  const { connectionStatus } = useSessionStore();

  return (
    <div className="h-screen w-screen flex flex-col terminal-bg terminal-boot">
      <header className="h-10 flex items-center justify-between px-3 border-b border-[#1a3a1a] bg-[#0d0d0d] shrink-0 font-mono text-[11px]">
        <div className="flex items-center gap-3">
          <span className="text-[#00ff00] terminal-glow font-bold">
            {"CAM://"}
          </span>
          <span className="text-[#00aa00]">Claude Agent Monitor</span>
        </div>
        <ThemeSwitcher />
      </header>

      <div className="flex-1 flex items-center justify-center font-mono">
        <div className="max-w-lg mx-auto px-6 text-[12px]">
          <div className="text-[#00ff00] terminal-glow mb-4 text-[14px]">
            $ cam status
          </div>
          <div className="text-[#00aa00] mb-1">
            {connectionStatus === "connected"
              ? "[OK] Server connected on port 7890"
              : "[..] Waiting for server connection..."}
          </div>
          <div className="text-[#ffaa00] mb-6">
            [!!] No active session detected
          </div>

          <div className="border border-[#1a3a1a] p-3 mb-4">
            <div className="text-[#00ff00] mb-2">{"# Getting started:"}</div>
            <div className="text-[#00aa00] space-y-1">
              <div>
                <span className="text-[#555]">1.</span>{" "}
                <span className="text-[#00ff00]">$ cam init</span>
                <span className="text-[#555]"> {"#"} configure hooks</span>
              </div>
              <div>
                <span className="text-[#555]">2.</span>{" "}
                <span className="text-[#00ff00]">
                  $ claude &quot;your task&quot;
                </span>
                <span className="text-[#555]"> {"#"} in another terminal</span>
              </div>
              <div>
                <span className="text-[#555]">3.</span>{" "}
                <span className="text-[#00aa00]">
                  Events appear automatically
                </span>
              </div>
            </div>
          </div>

          {connectionStatus === "reconnecting" && (
            <div className="text-[#ffaa00] animate-pulse">
              [..] Trying to reconnect to server...
            </div>
          )}

          <div className="text-[#00ff00] terminal-glow">
            <span className="terminal-cursor-active" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmptyState() {
  const { theme } = useThemeStore();

  switch (theme) {
    case "terminal":
      return <TerminalEmptyState />;
    case "pixel":
      return <PixelEmptyState />;
    case "modern":
    default:
      return <ModernEmptyState />;
  }
}
