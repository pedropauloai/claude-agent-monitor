import { useState, useEffect } from "react";
import { useSessionStore } from "../../../stores/session-store";
import { formatRelativeTime } from "../../../lib/formatters";
import { extractFilename } from "../../../lib/friendly-names.js";
import type { FileChange } from "@claudecam/shared";
import * as api from "../../../lib/api";

const CHANGE_TYPE_STYLES: Record<
  string,
  { dot: string; label: string; letter: string }
> = {
  created: { dot: "bg-cam-success", label: "Created", letter: "A" },
  modified: { dot: "bg-cam-warning", label: "Modified", letter: "M" },
  read: { dot: "bg-cam-accent", label: "Read", letter: "R" },
};

export function ModernFileWatcher() {
  const { session } = useSessionStore();
  const [files, setFiles] = useState<FileChange[]>([]);

  useEffect(() => {
    if (!session?.id) return;
    let cancelled = false;

    async function fetchFiles() {
      try {
        const { files: data } = await api.getFiles(session!.id);
        if (!cancelled) setFiles(data);
      } catch {
        // ignore
      }
    }

    fetchFiles();
    const interval = setInterval(fetchFiles, 5_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session?.id]);

  const created = files.filter((f) => f.changeType === "created");
  const modified = files.filter((f) => f.changeType === "modified");
  const read = files.filter((f) => f.changeType === "read");

  return (
    <div className="p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-wider text-cam-text-muted font-medium">
          File Watcher
        </span>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-cam-success">{created.length} new</span>
          <span className="text-cam-warning">{modified.length} mod</span>
          <span className="text-cam-accent">{read.length} read</span>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-cam-surface-2 border border-cam-border flex items-center justify-center mb-3">
            <svg
              className="w-5 h-5 text-cam-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          </div>
          <p className="text-xs text-cam-text-muted">No files touched yet</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto modern-scrollbar space-y-0.5">
          {files.map((file) => {
            const style = CHANGE_TYPE_STYLES[file.changeType];
            return (
              <div
                key={`${file.filePath}-${file.agentId}`}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-cam-surface-2 transition-colors group"
              >
                <span
                  className={`text-[10px] font-mono font-bold w-3 ${style.dot.replace("bg-", "text-")}`}
                >
                  {style.letter}
                </span>
                <span
                  className="flex-1 text-[11px] font-mono text-cam-text-secondary break-all"
                  title={file.filePath}
                >
                  {extractFilename(file.filePath)}
                </span>
                <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {file.touchCount > 1 && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-cam-surface-3 text-cam-text-muted">
                      x{file.touchCount}
                    </span>
                  )}
                  <span className="text-[9px] text-cam-text-muted">
                    {formatRelativeTime(file.lastTouchedAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
