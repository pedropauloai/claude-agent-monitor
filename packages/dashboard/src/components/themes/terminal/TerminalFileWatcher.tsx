import { useState, useEffect } from "react";
import { useSessionStore } from "../../../stores/session-store";
import { formatRelativeTime } from "../../../lib/formatters";
import { extractFilename } from "../../../lib/friendly-names.js";
import type { FileChange } from "@claudecam/shared";
import * as api from "../../../lib/api";

const CHANGE_CHARS: Record<string, { symbol: string; color: string }> = {
  created: { symbol: "+", color: "text-[#00ff00]" },
  modified: { symbol: "~", color: "text-[#ffaa00]" },
  read: { symbol: ".", color: "text-[#00ccff]" },
};

export function TerminalFileWatcher() {
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
    <div className="p-2 h-full flex flex-col font-mono text-[11px]">
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="terminal-muted">{"## tree --files ##"}</span>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-[#00ff00]">+{created.length}</span>
          <span className="text-[#ffaa00]">~{modified.length}</span>
          <span className="text-[#00ccff]">.{read.length}</span>
        </div>
      </div>
      <div className="border-t border-[#1a3a1a] mb-1" />

      {files.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="terminal-dim text-center">
            <p>{"> No files touched"}</p>
            <p className="terminal-cursor mt-1">{"> "}</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto terminal-scrollbar space-y-0">
          {files.map((file, i) => {
            const isLast = i === files.length - 1;
            const ch = CHANGE_CHARS[file.changeType] || {
              symbol: "?",
              color: "terminal-dim",
            };
            const branch = isLast ? "\u2514\u2500\u2500" : "\u251C\u2500\u2500";

            return (
              <div
                key={`${file.filePath}-${file.agentId}`}
                className="flex items-center gap-0 px-1 py-0.5 hover:bg-[#0a1a0a] transition-colors"
              >
                <span className="terminal-dim shrink-0 w-[28px]">{branch}</span>
                <span className={`shrink-0 w-[12px] font-bold ${ch.color}`}>
                  {ch.symbol}
                </span>
                <span
                  className="text-[#00aa00] flex-1 ml-1"
                  title={file.filePath}
                >
                  {extractFilename(file.filePath)}
                </span>
                {file.touchCount > 1 && (
                  <span className="terminal-dim shrink-0 ml-1">
                    x{file.touchCount}
                  </span>
                )}
                <span className="terminal-dim shrink-0 ml-2 text-[10px]">
                  {formatRelativeTime(file.lastTouchedAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
