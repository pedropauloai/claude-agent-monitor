import { useState, useEffect } from "react";
import { useSessionStore } from "../../../stores/session-store";
import { formatRelativeTime } from "../../../lib/formatters";
import { extractFilename } from "../../../lib/friendly-names.js";
import type { FileChange } from "@claudecam/shared";
import * as api from "../../../lib/api";

const ITEM_TYPES: Record<
  string,
  { icon: string; label: string; rarity: string; color: string }
> = {
  created: {
    icon: "\u2728",
    label: "NEW",
    rarity: "LEGENDARY",
    color: "var(--pixel-gold)",
  },
  modified: {
    icon: "\🔮",
    label: "MOD",
    rarity: "RARE",
    color: "var(--pixel-purple)",
  },
  read: {
    icon: "\📜",
    label: "READ",
    rarity: "COMMON",
    color: "var(--pixel-cyan)",
  },
};

export function PixelFileWatcher() {
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
      {/* Header */}
      <div
        className="flex items-center justify-between mb-3 pb-2"
        style={{ borderBottom: "2px solid var(--pixel-border)" }}
      >
        <span className="pixel-text-sm" style={{ color: "var(--pixel-gold)" }}>
          \📦 INVENTORY
        </span>
        <div className="flex items-center gap-2">
          <span
            className="pixel-text-xs"
            style={{ color: "var(--pixel-gold)" }}
          >
            {created.length}\u2728
          </span>
          <span
            className="pixel-text-xs"
            style={{ color: "var(--pixel-purple)" }}
          >
            {modified.length}\🔮
          </span>
          <span
            className="pixel-text-xs"
            style={{ color: "var(--pixel-cyan)" }}
          >
            {read.length}\📜
          </span>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="pixel-text-xl mb-3">\📦</div>
          <p
            className="pixel-text-sm"
            style={{ color: "var(--pixel-text-muted)" }}
          >
            INVENTORY EMPTY
          </p>
          <p
            className="pixel-text-xs mt-2"
            style={{ color: "var(--pixel-text-dim)" }}
          >
            NO LOOT COLLECTED YET
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pixel-scrollbar space-y-1">
          {files.map((file) => {
            const item = ITEM_TYPES[file.changeType] || ITEM_TYPES.read;
            return (
              <div
                key={`${file.filePath}-${file.agentId}`}
                className="flex items-center gap-2 px-2 py-1.5 group"
                style={{
                  border: "2px solid transparent",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "var(--pixel-border)";
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--pixel-surface)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "transparent";
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
                }}
              >
                {/* Item icon */}
                <span className="pixel-text-base shrink-0">{item.icon}</span>

                {/* File path */}
                <div className="flex-1 min-w-0">
                  <span
                    className="pixel-text-xs block"
                    style={{ color: "var(--pixel-text)" }}
                    title={file.filePath}
                  >
                    {extractFilename(file.filePath)}
                  </span>
                  <span className="pixel-text-xs" style={{ color: item.color }}>
                    [{item.rarity}]
                  </span>
                </div>

                {/* Touch count + time */}
                <div className="flex items-center gap-1 shrink-0">
                  {file.touchCount > 1 && (
                    <span
                      className="pixel-text-xs px-1"
                      style={{
                        color: "var(--pixel-gold)",
                        border: "1px solid var(--pixel-border)",
                        background: "var(--pixel-bg-dark)",
                      }}
                    >
                      x{file.touchCount}
                    </span>
                  )}
                  <span
                    className="pixel-text-xs"
                    style={{ color: "var(--pixel-text-dim)" }}
                  >
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
