import { useState, useEffect, useRef } from "react";
import { useSessionStore } from "../../stores/session-store";
import { useProjectStore } from "../../stores/project-store";
import { useThemeStore } from "../../stores/theme-store";
import * as api from "../../lib/api";
import type { Session } from "@cam/shared";

interface SessionOption {
  id: string;
  label: string;
  sublabel: string;
  status: string;
  agentCount: number;
  eventCount: number;
}

function formatSessionLabel(session: Session): string {
  const date = new Date(session.startedAt);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const mon = String(date.getMonth() + 1).padStart(2, "0");
  return `${hh}:${mm} - ${day}/${mon}`;
}

function shortId(id: string): string {
  return id.slice(0, 8);
}

export function SessionPicker() {
  const theme = useThemeStore((s) => s.theme);

  if (theme === "pixel") return <PixelVariant />;
  if (theme === "terminal") return <TerminalVariant />;
  return <ModernVariant />;
}

function useSessionOptions() {
  const { session, setSession } = useSessionStore();
  const activeProject = useProjectStore((s) => s.activeProject);
  const [options, setOptions] = useState<SessionOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        let sessions: Session[];

        if (activeProject) {
          // Fetch sessions filtered by the active project
          const result = await api.getProjectSessions(activeProject.id);
          sessions = result.sessions as Session[];
        } else {
          // Fallback: fetch all recent sessions
          const result = await api.getSessions({ limit: 20 });
          sessions = result.sessions as Session[];
        }

        if (cancelled) return;

        // Limit to 20 most recent
        const limited = sessions.slice(0, 20);

        const opts: SessionOption[] = limited.map((s) => ({
          id: s.id,
          label: formatSessionLabel(s),
          sublabel: shortId(s.id),
          status: s.status,
          agentCount: s.agentCount,
          eventCount: s.eventCount,
        }));

        setOptions(opts);
      } catch {
        // server unavailable
      }
    }

    load();
    const interval = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeProject?.id]);

  const selectSession = async (opt: SessionOption) => {
    try {
      const { session: s } = await api.getSession(opt.id);
      if (s) setSession(s as Session);
    } catch {
      // ignore
    }
    setIsOpen(false);
  };

  const currentId = session?.id ?? null;

  return {
    options,
    isOpen,
    setIsOpen,
    selectSession,
    currentId,
  };
}

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose]);
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "active"
      ? "bg-green-500"
      : status === "error"
        ? "bg-red-500"
        : "bg-gray-500";
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${color} ${status === "active" ? "animate-pulse" : ""}`}
    />
  );
}

function ModernVariant() {
  const {
    options,
    isOpen,
    setIsOpen,
    selectSession,
    currentId,
  } = useSessionOptions();
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setIsOpen(false));

  const currentLabel =
    options.find((o) => o.id === currentId)?.label ?? "Sem sessao";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 text-xs rounded border border-cam-border/50 hover:bg-cam-surface/60 transition-colors"
      >
        <span className="text-cam-text-muted">Sessao:</span>
        <span className="text-cam-text font-medium">{currentLabel}</span>
        <span className="text-cam-text-muted text-[10px]">
          {isOpen ? "\u25B2" : "\u25BC"}
        </span>
      </button>

      {isOpen && options.length > 0 && (
        <div className="absolute top-full mt-1 right-0 z-[100] w-72 max-h-64 overflow-y-auto rounded-lg border border-cam-border/50 bg-cam-bg/95 backdrop-blur-sm shadow-xl">
          {options.map((opt) => {
            const isActive = opt.id === currentId;
            return (
              <button
                key={opt.id}
                onClick={() => selectSession(opt)}
                className={`w-full px-3 py-2 flex items-center gap-2 text-left text-xs hover:bg-cam-surface/60 transition-colors ${
                  isActive
                    ? "bg-cam-surface/40 border-l-2 border-cam-accent"
                    : ""
                }`}
              >
                <StatusDot status={opt.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-cam-text font-medium truncate">
                      {opt.label}
                    </span>
                  </div>
                  <span className="text-cam-text-muted text-[10px]">
                    {opt.sublabel}
                  </span>
                </div>
                <div className="text-[10px] text-cam-text-muted text-right shrink-0">
                  <div>{opt.agentCount}ag</div>
                  <div>{opt.eventCount}ev</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PixelVariant() {
  const {
    options,
    isOpen,
    setIsOpen,
    selectSession,
    currentId,
  } = useSessionOptions();
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setIsOpen(false));

  const currentLabel =
    options.find((o) => o.id === currentId)?.label ?? "---";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1 pixel-text-xs"
        style={{
          color: "var(--pixel-text)",
          border: "2px solid var(--pixel-border)",
          background: "var(--pixel-bg-dark)",
        }}
      >
        <span style={{ color: "var(--pixel-text-dim)" }}>SAVE:</span>
        <span style={{ color: "var(--pixel-gold)" }}>{currentLabel}</span>
      </button>

      {isOpen && options.length > 0 && (
        <div
          className="absolute top-full mt-1 right-0 z-[100] w-72 max-h-64 overflow-y-auto"
          style={{
            background: "var(--pixel-bg-dark)",
            border: "3px solid var(--pixel-border)",
          }}
        >
          {options.map((opt) => {
            const isActive = opt.id === currentId;
            return (
              <button
                key={opt.id}
                onClick={() => selectSession(opt)}
                className="w-full px-3 py-2 flex items-center gap-2 text-left pixel-text-xs"
                style={{
                  background: isActive ? "var(--pixel-bg)" : "transparent",
                  borderLeft: isActive
                    ? "3px solid var(--pixel-gold)"
                    : "3px solid transparent",
                  borderBottom: "1px solid var(--pixel-border)",
                  color: "var(--pixel-text)",
                }}
              >
                <span
                  style={{
                    color:
                      opt.status === "active"
                        ? "var(--pixel-green)"
                        : "var(--pixel-text-dim)",
                  }}
                >
                  {opt.status === "active" ? "\u25CF" : "\u25CB"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="truncate">{opt.label}</span>
                  </div>
                  <span
                    style={{ color: "var(--pixel-text-dim)", fontSize: "9px" }}
                  >
                    {opt.sublabel}
                  </span>
                </div>
                <span
                  style={{ color: "var(--pixel-text-dim)", fontSize: "9px" }}
                  className="shrink-0"
                >
                  {opt.agentCount}ag {opt.eventCount}ev
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TerminalVariant() {
  const {
    options,
    isOpen,
    setIsOpen,
    selectSession,
    currentId,
  } = useSessionOptions();
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setIsOpen(false));

  const currentLabel =
    options.find((o) => o.id === currentId)?.label ?? "none";

  return (
    <div ref={ref} className="relative font-mono text-[11px]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 hover:text-[#00ff00] transition-colors"
      >
        <span className="terminal-muted">session:</span>
        <span className="text-[#00ff00] terminal-glow">{currentLabel}</span>
        <span className="terminal-dim">{isOpen ? "[-]" : "[+]"}</span>
      </button>

      {isOpen && options.length > 0 && (
        <div className="absolute top-full mt-1 right-0 z-[100] w-72 max-h-64 overflow-y-auto bg-[#0d0d0d] border border-[#1a3a1a]">
          {options.map((opt) => {
            const isActive = opt.id === currentId;
            return (
              <button
                key={opt.id}
                onClick={() => selectSession(opt)}
                className={`w-full px-2 py-1 flex items-center gap-2 text-left border-b border-[#1a3a1a] hover:bg-[#0a1a0a] transition-colors ${
                  isActive ? "bg-[#0a1a0a]" : ""
                }`}
              >
                <span
                  className={
                    opt.status === "active"
                      ? "text-[#00ff00]"
                      : opt.status === "error"
                        ? "terminal-error"
                        : "terminal-dim"
                  }
                >
                  {opt.status === "active"
                    ? "[*]"
                    : opt.status === "error"
                      ? "[!]"
                      : "[x]"}
                </span>
                <div className="flex-1 min-w-0">
                  <span
                    className={
                      isActive
                        ? "text-[#00ff00] terminal-glow"
                        : "text-[#00aa00]"
                    }
                  >
                    {opt.label}
                  </span>
                  <span className="terminal-dim ml-1">{opt.sublabel}</span>
                </div>
                <span className="terminal-dim shrink-0">
                  {opt.agentCount}a/{opt.eventCount}e
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
