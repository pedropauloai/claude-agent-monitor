import { useState, useCallback } from "react";
import { useSessionStore } from "../../stores/session-store.js";
import { useThemeStore } from "../../stores/theme-store.js";

const DISMISSED_KEY = "cam-in-process-dismissed";

function useInProcessDetection(): boolean {
  const agents = useSessionStore((s) => s.agents);
  const session = useSessionStore((s) => s.session);

  if (!session || agents.length < 2) return false;

  const sessionIds = new Set(agents.map((a) => a.sessionId));
  return sessionIds.size === 1;
}

function useDismissed(sessionId: string | undefined): [boolean, () => void] {
  const [dismissed, setDismissed] = useState(() => {
    if (!sessionId) return false;
    try {
      const stored = localStorage.getItem(DISMISSED_KEY);
      return stored === sessionId;
    } catch {
      return false;
    }
  });

  const dismiss = useCallback(() => {
    if (sessionId) {
      try {
        localStorage.setItem(DISMISSED_KEY, sessionId);
      } catch {
        // ignore storage errors
      }
    }
    setDismissed(true);
  }, [sessionId]);

  return [dismissed, dismiss];
}

export function InProcessWarning() {
  const isInProcess = useInProcessDetection();
  const session = useSessionStore((s) => s.session);
  const [dismissed, dismiss] = useDismissed(session?.id);
  const { theme } = useThemeStore();

  if (!isInProcess || dismissed) return null;

  switch (theme) {
    case "pixel":
      return <PixelBanner onDismiss={dismiss} />;
    case "terminal":
      return <TerminalBanner onDismiss={dismiss} />;
    default:
      return <ModernBanner onDismiss={dismiss} />;
  }
}

function ModernBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="h-8 flex items-center justify-between px-4 bg-amber-500/10 border-b border-amber-500/30 shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-xs text-amber-300">
          In-process mode detected &mdash; per-agent tracking is limited. Use
          tmux + Teams for full E2E tracking.
        </span>
      </div>
      <button
        onClick={onDismiss}
        className="text-amber-400/60 hover:text-amber-300 text-xs px-1"
        title="Dismiss"
      >
        &times;
      </button>
    </div>
  );
}

function PixelBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="h-8 flex items-center justify-between px-4 shrink-0"
      style={{
        background: "rgba(255, 170, 0, 0.1)",
        borderBottom: "2px solid var(--pixel-gold, #d4a017)",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="pixel-text-xs"
          style={{ color: "var(--pixel-gold, #d4a017)" }}
        >
          ! IN-PROCESS MODE - PER-AGENT TRACKING LIMITED. USE TMUX + TEAMS FOR
          FULL TRACKING.
        </span>
      </div>
      <button
        onClick={onDismiss}
        className="pixel-text-xs px-1"
        style={{ color: "var(--pixel-gold, #d4a017)", opacity: 0.6 }}
        title="Dismiss"
      >
        X
      </button>
    </div>
  );
}

function TerminalBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="h-8 flex items-center justify-between px-3 bg-[#1a1a00] border-b border-[#3a3a1a] shrink-0 font-mono text-[11px]">
      <div className="flex items-center gap-2">
        <span className="text-[#ffaa00]">
          [WARN] in-process mode: per-agent tracking limited. use tmux + teams
          for full e2e tracking.
        </span>
      </div>
      <button
        onClick={onDismiss}
        className="text-[#ffaa00]/60 hover:text-[#ffaa00] px-1"
        title="Dismiss"
      >
        [x]
      </button>
    </div>
  );
}
