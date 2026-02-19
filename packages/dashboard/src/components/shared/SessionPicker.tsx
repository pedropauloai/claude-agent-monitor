import { useState, useEffect, useRef, useCallback } from "react";
import { useSessionStore } from "../../stores/session-store";
import { useProjectStore } from "../../stores/project-store";
import { useThemeStore } from "../../stores/theme-store";
import * as api from "../../lib/api";
import type { Session } from "@claudecam/shared";

interface SessionOption {
  id: string;
  label: string;
  sublabel: string;
  status: string;
  agentCount: number;
  eventCount: number;
  name?: string;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const loadOptions = useCallback(async () => {
    try {
      let sessions: Session[];

      if (activeProject) {
        const result = await api.getProjectSessions(activeProject.id);
        sessions = result.sessions as Session[];
      } else {
        const result = await api.getSessions({ limit: 20 });
        sessions = result.sessions as Session[];
      }

      const limited = sessions.slice(0, 20);

      const opts: SessionOption[] = limited.map((s) => ({
        id: s.id,
        label: formatSessionLabel(s),
        sublabel: shortId(s.id),
        status: s.status,
        agentCount: s.agentCount,
        eventCount: s.eventCount,
        name: s.metadata?.name as string | undefined,
      }));

      opts.sort((a, b) => {
        if (a.status === "active" && b.status !== "active") return -1;
        if (a.status !== "active" && b.status === "active") return 1;
        return 0;
      });

      setOptions(opts);
    } catch {
      // server unavailable
    }
  }, [activeProject?.id]);

  useEffect(() => {
    loadOptions();
    const interval = setInterval(loadOptions, 15_000);
    return () => clearInterval(interval);
  }, [loadOptions]);

  const selectSession = async (opt: SessionOption) => {
    if (editingId) return; // Don't select while editing
    try {
      const { session: s } = await api.getSession(opt.id);
      if (s) setSession(s as Session);
    } catch {
      // ignore
    }
    setIsOpen(false);
  };

  const startRename = (opt: SessionOption, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(opt.id);
    setEditValue(opt.name || "");
  };

  const saveRename = async () => {
    if (!editingId || !editValue.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await api.renameSession(editingId, editValue.trim());
      // Update the option in-place for instant feedback
      setOptions((prev) =>
        prev.map((o) =>
          o.id === editingId ? { ...o, name: editValue.trim() } : o,
        ),
      );
      // Also update session store if this is the current session
      const currentSession = useSessionStore.getState().session;
      if (currentSession && currentSession.id === editingId) {
        useSessionStore.getState().setSession({
          ...currentSession,
          metadata: { ...currentSession.metadata, name: editValue.trim() },
        });
      }
    } catch {
      // ignore
    }
    setEditingId(null);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditValue("");
  };

  const closeSessionById = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.closeSession(id);
      // Update option status locally for instant feedback
      setOptions((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, status: "completed" } : o,
        ),
      );
      // If closing the current session, update the store
      const currentSession = useSessionStore.getState().session;
      if (currentSession && currentSession.id === id) {
        useSessionStore.getState().setSession({
          ...currentSession,
          status: "completed",
          endedAt: new Date().toISOString(),
        });
      }
    } catch {
      // ignore
    }
  };

  const currentId = session?.id ?? null;

  return {
    options,
    isOpen,
    setIsOpen,
    selectSession,
    currentId,
    editingId,
    editValue,
    setEditValue,
    startRename,
    saveRename,
    cancelRename,
    closeSessionById,
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

/** Pencil icon for rename button. */
function PencilIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

/** X icon for close button. */
function CloseIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

interface SessionRowProps {
  opt: SessionOption;
  isSelected: boolean;
  isEditing: boolean;
  editValue: string;
  onSelect: () => void;
  onStartRename: (e: React.MouseEvent) => void;
  onEditChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onClose?: (e: React.MouseEvent) => void;
  dimmed?: boolean;
}

function ModernSessionRow({
  opt,
  isSelected,
  isEditing,
  editValue,
  onSelect,
  onStartRename,
  onEditChange,
  onSave,
  onCancel,
  onClose,
  dimmed,
}: SessionRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <div
      className={`group w-full px-3 py-2 flex items-center gap-2 text-left text-xs hover:bg-cam-surface/60 transition-colors cursor-pointer ${
        isSelected ? "bg-cam-surface/40 border-l-2 border-cam-accent" : ""
      } ${dimmed ? "opacity-60" : ""}`}
      onClick={isEditing ? undefined : onSelect}
    >
      <StatusDot status={opt.status} />
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave();
              if (e.key === "Escape") onCancel();
            }}
            onBlur={onSave}
            className="w-full px-1 py-0.5 text-xs bg-cam-surface border border-cam-accent rounded text-cam-text outline-none"
            maxLength={100}
          />
        ) : (
          <>
            <div className="flex items-center gap-1">
              <span className="text-cam-text font-medium truncate">
                {opt.name || opt.label}
              </span>
              <button
                onClick={onStartRename}
                className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-cam-text-muted transition-opacity shrink-0"
                title="Rename session"
              >
                <PencilIcon />
              </button>
              {onClose && opt.status === "active" && (
                <button
                  onClick={onClose}
                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-red-400 transition-opacity shrink-0"
                  title="Close session"
                >
                  <CloseIcon />
                </button>
              )}
            </div>
            <span className="text-cam-text-muted text-[10px]">
              {opt.name ? opt.label : opt.sublabel}
            </span>
          </>
        )}
      </div>
      {!isEditing && (
        <div className="text-[10px] text-cam-text-muted text-right shrink-0">
          <div>{opt.agentCount}ag</div>
          <div>{opt.eventCount}ev</div>
        </div>
      )}
    </div>
  );
}

function ModernVariant() {
  const {
    options,
    isOpen,
    setIsOpen,
    selectSession,
    currentId,
    editingId,
    editValue,
    setEditValue,
    startRename,
    saveRename,
    cancelRename,
    closeSessionById,
  } = useSessionOptions();
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => {
    if (!editingId) setIsOpen(false);
  });

  const current = options.find((o) => o.id === currentId);
  const currentLabel = current?.name || current?.label || "No session";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 text-xs rounded border border-cam-border/50 hover:bg-cam-surface/60 transition-colors"
      >
        <span className="text-cam-text-muted">Session:</span>
        <span className="text-cam-text font-medium">{currentLabel}</span>
        <span className="text-cam-text-muted text-[10px]">
          {isOpen ? "\u25B2" : "\u25BC"}
        </span>
      </button>

      {isOpen && options.length > 0 && (
        <div className="absolute top-full mt-1 right-0 z-[100] w-80 max-h-64 overflow-y-auto rounded-lg border border-cam-border/50 bg-cam-bg shadow-xl">
          {(() => {
            const activeOpts = options.filter((o) => o.status === "active");
            const inactiveOpts = options.filter((o) => o.status !== "active");
            return (
              <>
                {activeOpts.map((opt) => (
                  <ModernSessionRow
                    key={opt.id}
                    opt={opt}
                    isSelected={opt.id === currentId}
                    isEditing={editingId === opt.id}
                    editValue={editValue}
                    onSelect={() => selectSession(opt)}
                    onStartRename={(e) => startRename(opt, e)}
                    onEditChange={setEditValue}
                    onSave={saveRename}
                    onCancel={cancelRename}
                    onClose={(e) => closeSessionById(opt.id, e)}
                  />
                ))}
                {activeOpts.length > 0 && inactiveOpts.length > 0 && (
                  <div className="px-3 py-1.5 border-t border-cam-border/30">
                    <span className="text-[9px] uppercase tracking-wider text-cam-text-muted">
                      Ended
                    </span>
                  </div>
                )}
                {inactiveOpts.map((opt) => (
                  <ModernSessionRow
                    key={opt.id}
                    opt={opt}
                    isSelected={opt.id === currentId}
                    isEditing={editingId === opt.id}
                    editValue={editValue}
                    onSelect={() => selectSession(opt)}
                    onStartRename={(e) => startRename(opt, e)}
                    onEditChange={setEditValue}
                    onSave={saveRename}
                    onCancel={cancelRename}
                    dimmed
                  />
                ))}
              </>
            );
          })()}
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
    editingId,
    editValue,
    setEditValue,
    startRename,
    saveRename,
    cancelRename,
  } = useSessionOptions();
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => {
    if (!editingId) setIsOpen(false);
  });

  const current = options.find((o) => o.id === currentId);
  const currentLabel = current?.name || current?.label || "---";

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
          className="absolute top-full mt-1 right-0 z-[100] w-80 max-h-64 overflow-y-auto"
          style={{
            background: "var(--pixel-bg-dark)",
            border: "3px solid var(--pixel-border)",
          }}
        >
          {(() => {
            const activeOpts = options.filter((o) => o.status === "active");
            const inactiveOpts = options.filter((o) => o.status !== "active");
            return (
              <>
                {activeOpts.map((opt) => {
                  const isActive = opt.id === currentId;
                  const isEditing = editingId === opt.id;
                  return (
                    <div
                      key={opt.id}
                      className="group w-full px-3 py-2 flex items-center gap-2 text-left pixel-text-xs cursor-pointer"
                      style={{
                        background: isActive
                          ? "var(--pixel-bg)"
                          : "transparent",
                        borderLeft: isActive
                          ? "3px solid var(--pixel-gold)"
                          : "3px solid transparent",
                        borderBottom: "1px solid var(--pixel-border)",
                        color: "var(--pixel-text)",
                      }}
                      onClick={
                        isEditing ? undefined : () => selectSession(opt)
                      }
                    >
                      <span style={{ color: "var(--pixel-green)" }}>
                        {"\u25CF"}
                      </span>
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveRename();
                              if (e.key === "Escape") cancelRename();
                            }}
                            onBlur={saveRename}
                            autoFocus
                            className="w-full px-1 py-0.5 pixel-text-xs outline-none"
                            style={{
                              background: "var(--pixel-bg)",
                              border: "2px solid var(--pixel-gold)",
                              color: "var(--pixel-text)",
                            }}
                            maxLength={100}
                          />
                        ) : (
                          <>
                            <div className="flex items-center gap-1">
                              <span className="truncate">
                                {opt.name || opt.label}
                              </span>
                              <button
                                onClick={(e) => startRename(opt, e)}
                                className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity shrink-0"
                                style={{ color: "var(--pixel-text-dim)" }}
                                title="Rename session"
                              >
                                <PencilIcon />
                              </button>
                            </div>
                            <span
                              style={{
                                color: "var(--pixel-text-dim)",
                                fontSize: "9px",
                              }}
                            >
                              {opt.name ? opt.label : opt.sublabel}
                            </span>
                          </>
                        )}
                      </div>
                      {!isEditing && (
                        <span
                          style={{
                            color: "var(--pixel-text-dim)",
                            fontSize: "9px",
                          }}
                          className="shrink-0"
                        >
                          {opt.agentCount}ag {opt.eventCount}ev
                        </span>
                      )}
                    </div>
                  );
                })}
                {activeOpts.length > 0 && inactiveOpts.length > 0 && (
                  <div
                    className="px-3 py-1"
                    style={{
                      borderTop: "2px solid var(--pixel-border)",
                      color: "var(--pixel-text-dim)",
                      fontSize: "9px",
                    }}
                  >
                    ENDED
                  </div>
                )}
                {inactiveOpts.map((opt) => {
                  const isActive = opt.id === currentId;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => selectSession(opt)}
                      className="group w-full px-3 py-2 flex items-center gap-2 text-left pixel-text-xs"
                      style={{
                        background: isActive
                          ? "var(--pixel-bg)"
                          : "transparent",
                        borderLeft: isActive
                          ? "3px solid var(--pixel-gold)"
                          : "3px solid transparent",
                        borderBottom: "1px solid var(--pixel-border)",
                        color: "var(--pixel-text)",
                        opacity: isActive ? 1 : 0.5,
                      }}
                    >
                      <span style={{ color: "var(--pixel-text-dim)" }}>
                        {"\u25CB"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="truncate">
                          {opt.name || opt.label}
                        </span>
                        <span
                          style={{
                            color: "var(--pixel-text-dim)",
                            fontSize: "9px",
                            display: "block",
                          }}
                        >
                          {opt.name ? opt.label : opt.sublabel}
                        </span>
                      </div>
                      <span
                        style={{
                          color: "var(--pixel-text-dim)",
                          fontSize: "9px",
                        }}
                        className="shrink-0"
                      >
                        {opt.agentCount}ag {opt.eventCount}ev
                      </span>
                    </button>
                  );
                })}
              </>
            );
          })()}
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
    editingId,
    editValue,
    setEditValue,
    startRename,
    saveRename,
    cancelRename,
  } = useSessionOptions();
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => {
    if (!editingId) setIsOpen(false);
  });

  const current = options.find((o) => o.id === currentId);
  const currentLabel = current?.name || current?.label || "none";

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
        <div className="absolute top-full mt-1 right-0 z-[100] w-80 max-h-64 overflow-y-auto bg-[#0d0d0d] border border-[#1a3a1a]">
          {(() => {
            const activeOpts = options.filter((o) => o.status === "active");
            const inactiveOpts = options.filter((o) => o.status !== "active");
            return (
              <>
                {activeOpts.map((opt) => {
                  const isActive = opt.id === currentId;
                  const isEditing = editingId === opt.id;
                  return (
                    <div
                      key={opt.id}
                      className={`group w-full px-2 py-1 flex items-center gap-2 text-left border-b border-[#1a3a1a] hover:bg-[#0a1a0a] transition-colors cursor-pointer ${
                        isActive ? "bg-[#0a1a0a]" : ""
                      }`}
                      onClick={
                        isEditing ? undefined : () => selectSession(opt)
                      }
                    >
                      <span className="text-[#00ff00]">{"[*]"}</span>
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveRename();
                              if (e.key === "Escape") cancelRename();
                            }}
                            onBlur={saveRename}
                            autoFocus
                            className="w-full px-1 bg-[#0a1a0a] border border-[#00ff00] text-[#00ff00] font-mono text-[11px] outline-none"
                            maxLength={100}
                          />
                        ) : (
                          <>
                            <span
                              className={
                                isActive
                                  ? "text-[#00ff00] terminal-glow"
                                  : "text-[#00aa00]"
                              }
                            >
                              {opt.name || opt.label}
                            </span>
                            <button
                              onClick={(e) => startRename(opt, e)}
                              className="opacity-0 group-hover:opacity-60 hover:!opacity-100 terminal-dim ml-1 transition-opacity"
                              title="Rename session"
                            >
                              [e]
                            </button>
                            <span className="terminal-dim ml-1">
                              {opt.name ? opt.label : opt.sublabel}
                            </span>
                          </>
                        )}
                      </div>
                      {!isEditing && (
                        <span className="terminal-dim shrink-0">
                          {opt.agentCount}a/{opt.eventCount}e
                        </span>
                      )}
                    </div>
                  );
                })}
                {activeOpts.length > 0 && inactiveOpts.length > 0 && (
                  <div className="px-2 py-1 border-t border-[#1a3a1a] text-[9px] terminal-dim uppercase tracking-wider">
                    ended
                  </div>
                )}
                {inactiveOpts.map((opt) => {
                  const isActive = opt.id === currentId;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => selectSession(opt)}
                      className={`w-full px-2 py-1 flex items-center gap-2 text-left border-b border-[#1a3a1a] hover:bg-[#0a1a0a] transition-colors opacity-50 ${
                        isActive ? "bg-[#0a1a0a] opacity-100" : ""
                      }`}
                    >
                      <span
                        className={
                          opt.status === "error"
                            ? "terminal-error"
                            : "terminal-dim"
                        }
                      >
                        {opt.status === "error" ? "[!]" : "[x]"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span
                          className={
                            isActive
                              ? "text-[#00ff00] terminal-glow"
                              : "text-[#00aa00]"
                          }
                        >
                          {opt.name || opt.label}
                        </span>
                        <span className="terminal-dim ml-1">
                          {opt.name ? opt.label : opt.sublabel}
                        </span>
                      </div>
                      <span className="terminal-dim shrink-0">
                        {opt.agentCount}a/{opt.eventCount}e
                      </span>
                    </button>
                  );
                })}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
