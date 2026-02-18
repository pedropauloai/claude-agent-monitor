import { useState } from "react";
import { useSessionStore } from "../../../stores/session-store";
import { formatTimestamp, formatRelativeTime } from "../../../lib/formatters";
import {
  getAgentDisplayName,
  extractFilename,
} from "../../../lib/friendly-names.js";

type TabId = "activity" | "files" | "errors" | "messages";

const TABS: { id: TabId; label: string; key: string }[] = [
  { id: "activity", label: "Activity", key: "1" },
  { id: "files", label: "Files", key: "2" },
  { id: "errors", label: "Errors", key: "3" },
  { id: "messages", label: "Messages", key: "4" },
];

const STATUS_CHARS: Record<string, string> = {
  active: "[ACTIVE]",
  idle: "[IDLE]  ",
  error: "[ERROR] ",
  completed: "[DONE]  ",
  shutdown: "[DOWN]  ",
};

export function TerminalAgentDetail() {
  const { selectedAgentId, agents, events, selectAgent } = useSessionStore();
  const [activeTab, setActiveTab] = useState<TabId>("activity");

  const agent = agents.find((a) => a.id === selectedAgentId);
  if (!agent) return null;

  const agentEvents = events.filter((e) => e.agentId === agent.id);
  const agentErrors = agentEvents.filter(
    (e) => e.category === "error" || e.error,
  );
  const agentFiles = agentEvents
    .filter((e) => e.filePath)
    .reduce((acc, e) => {
      if (e.filePath && !acc.includes(e.filePath)) acc.push(e.filePath);
      return acc;
    }, [] as string[]);
  const agentMessages = agentEvents.filter((e) => e.category === "message");

  const statusChar = STATUS_CHARS[agent.status] || "[???]   ";

  return (
    <div className="h-full flex flex-col font-mono text-[11px]">
      {/* Header */}
      <div className="p-2 border-b border-[#1a3a1a] shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-[#00ff00] terminal-glow font-bold"
            title={`${agent.name} (${agent.id})`}
          >
            {">> " + getAgentDisplayName(agent.id, agent.name, agent.type ?? undefined)}
          </span>
          <button
            onClick={() => selectAgent(null)}
            className="text-[#006600] hover:text-[#ff3333] transition-colors"
          >
            [X]
          </button>
        </div>

        <div className="terminal-dim">
          <span
            className={
              agent.status === "active"
                ? "text-[#00ff00]"
                : agent.status === "error"
                  ? "terminal-error"
                  : "terminal-muted"
            }
          >
            {statusChar}
          </span>
          <span className="ml-2">{agent.type}</span>
        </div>

        {/* Stats box */}
        <div className="mt-2 border border-[#1a3a1a] p-1.5">
          <div className="text-[10px] terminal-dim mb-1">
            {
              "\u250C\u2500\u2500 STATS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510"
            }
          </div>
          <div className="grid grid-cols-3 gap-x-2 text-[10px]">
            <div>
              <span className="terminal-dim">calls:</span>
              <span className="text-[#00ff00] ml-1">{agent.toolCallCount}</span>
            </div>
            <div>
              <span className="terminal-dim">errs:</span>
              <span
                className={`ml-1 ${agent.errorCount > 0 ? "terminal-error" : "text-[#00ff00]"}`}
              >
                {agent.errorCount}
              </span>
            </div>
            <div>
              <span className="terminal-dim">last:</span>
              <span className="text-[#00aa00] ml-1">
                {formatRelativeTime(agent.lastActivityAt)}
              </span>
            </div>
          </div>
          <div className="text-[10px] terminal-dim mt-1">
            {
              "\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518"
            }
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1a3a1a] shrink-0">
        {TABS.map((tab) => {
          const count =
            tab.id === "activity"
              ? agentEvents.length
              : tab.id === "files"
                ? agentFiles.length
                : tab.id === "errors"
                  ? agentErrors.length
                  : agentMessages.length;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1.5 text-[10px] font-mono transition-colors border-b ${
                activeTab === tab.id
                  ? "text-[#00ff00] border-[#00ff00] bg-[#0a1f0a] terminal-glow"
                  : "text-[#006600] border-transparent hover:text-[#00aa00]"
              }`}
            >
              [{tab.key}]{tab.label}({count})
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto terminal-scrollbar">
        {activeTab === "activity" && (
          <div>
            {agentEvents.length === 0 ? (
              <p className="terminal-dim p-3 text-center">
                {"> No activity recorded"}
              </p>
            ) : (
              agentEvents.slice(0, 100).map((event) => (
                <div
                  key={event.id}
                  className="px-2 py-0.5 hover:bg-[#0a1a0a] transition-colors border-b border-[#0a1a0a]"
                >
                  <div className="flex items-center gap-2">
                    <span className="terminal-dim shrink-0 text-[10px]">
                      {formatTimestamp(event.timestamp)}
                    </span>
                    <span
                      className={`text-[10px] ${event.category === "error" ? "terminal-error" : "text-[#00ccff]"}`}
                    >
                      {event.tool || event.hookType}
                    </span>
                    {event.filePath && (
                      <span
                        className="text-[#00aa00] text-[10px]"
                        title={event.filePath}
                      >
                        {extractFilename(event.filePath)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "files" && (
          <div className="p-2">
            {agentFiles.length === 0 ? (
              <p className="terminal-dim text-center">{"> No files touched"}</p>
            ) : (
              agentFiles.map((filePath, i) => {
                const isLast = i === agentFiles.length - 1;
                const branch = isLast ? "\u2514\u2500" : "\u251C\u2500";
                return (
                  <div
                    key={filePath}
                    className="flex items-center gap-1 py-0.5 hover:bg-[#0a1a0a]"
                  >
                    <span className="terminal-dim">{branch}</span>
                    <span
                      className="text-[#00aa00] text-[10px] break-all"
                      title={filePath}
                    >
                      {extractFilename(filePath)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "errors" && (
          <div>
            {agentErrors.length === 0 ? (
              <p className="terminal-dim p-3 text-center">
                {"> No errors - all clear"}
              </p>
            ) : (
              agentErrors.map((event) => (
                <div
                  key={event.id}
                  className="px-2 py-1 border-b border-[#1a0a0a]"
                >
                  <div className="flex items-center gap-2">
                    <span className="terminal-dim text-[10px]">
                      {formatTimestamp(event.timestamp)}
                    </span>
                    <span className="terminal-error text-[10px]">
                      {event.tool || event.hookType}
                    </span>
                  </div>
                  {event.error && (
                    <p className="terminal-error text-[10px] ml-2 mt-0.5 break-all">
                      {"! " + event.error}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "messages" && (
          <div>
            {agentMessages.length === 0 ? (
              <p className="terminal-dim p-3 text-center">{"> No messages"}</p>
            ) : (
              agentMessages.map((event) => (
                <div
                  key={event.id}
                  className="px-2 py-1 border-b border-[#0a1a0a]"
                >
                  <div className="flex items-center gap-2">
                    <span className="terminal-dim text-[10px]">
                      {formatTimestamp(event.timestamp)}
                    </span>
                    <span className="terminal-info text-[10px]">
                      SendMessage
                    </span>
                  </div>
                  {event.input && (
                    <p className="text-[#00aa00] text-[10px] ml-2 mt-0.5 break-words whitespace-pre-wrap">
                      {"> " + event.input}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
