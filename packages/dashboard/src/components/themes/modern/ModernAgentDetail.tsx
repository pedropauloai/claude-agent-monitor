import { useState } from "react";
import { useSessionStore } from "../../../stores/session-store";
import {
  formatTimestamp,
  formatRelativeTime,
  formatDuration,
  getStatusDotColor,
  generateIdenticon,
  getCategoryColor,
} from "../../../lib/formatters";
import {
  getAgentDisplayName,
  extractFilename,
} from "../../../lib/friendly-names.js";

type TabId = "activity" | "files" | "errors" | "messages";

const TABS: { id: TabId; label: string }[] = [
  { id: "activity", label: "Activity" },
  { id: "files", label: "Files" },
  { id: "errors", label: "Errors" },
  { id: "messages", label: "Messages" },
];

export function ModernAgentDetail() {
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
  const identiconColor = generateIdenticon(agent.name);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-cam-border/30 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
              style={{
                backgroundColor: `${identiconColor}20`,
                color: identiconColor,
              }}
            >
              {agent.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3
                className="text-sm font-semibold text-cam-text"
                title={`${agent.name} (${agent.id})`}
              >
                {getAgentDisplayName(agent.id, agent.name, agent.type ?? undefined)}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(agent.status)}`}
                />
                <span className="text-[10px] text-cam-text-muted capitalize">
                  {agent.status}
                </span>
                <span className="text-[10px] text-cam-text-muted">
                  -- {agent.type}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => selectAgent(null)}
            className="text-cam-text-muted hover:text-cam-text transition-colors p-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Tool Calls", value: agent.toolCallCount },
            {
              label: "Errors",
              value: agent.errorCount,
              isError: agent.errorCount > 0,
            },
            {
              label: "Last Active",
              value: formatRelativeTime(agent.lastActivityAt),
              isText: true,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-cam-surface-2 rounded-md px-2 py-1.5 text-center"
            >
              <div
                className={`text-xs font-mono font-semibold ${stat.isError ? "text-cam-error" : "text-cam-text"}`}
              >
                {stat.value}
              </div>
              <div className="text-[9px] text-cam-text-muted">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-cam-border/30 shrink-0">
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
              className={`flex-1 py-2 text-[10px] font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "text-cam-accent border-cam-accent"
                  : "text-cam-text-muted border-transparent hover:text-cam-text-secondary"
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto modern-scrollbar">
        {activeTab === "activity" && (
          <div className="divide-y divide-cam-border/20">
            {agentEvents.length === 0 ? (
              <p className="text-xs text-cam-text-muted p-4 text-center">
                No activity recorded
              </p>
            ) : (
              agentEvents.slice(0, 100).map((event) => (
                <div
                  key={event.id}
                  className="px-3 py-2 hover:bg-cam-surface/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-medium ${getCategoryColor(event.category)}`}
                    >
                      {event.tool || event.hookType}
                    </span>
                    <span className="text-[9px] text-cam-text-muted font-mono">
                      {formatTimestamp(event.timestamp)}
                    </span>
                  </div>
                  {event.filePath && (
                    <span
                      className="text-[10px] text-cam-text-secondary font-mono block mt-0.5"
                      title={event.filePath}
                    >
                      {extractFilename(event.filePath)}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "files" && (
          <div className="p-2 space-y-0.5">
            {agentFiles.length === 0 ? (
              <p className="text-xs text-cam-text-muted p-4 text-center">
                No files touched
              </p>
            ) : (
              agentFiles.map((filePath) => (
                <div
                  key={filePath}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-cam-surface-2 transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5 text-cam-text-muted shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span
                    className="text-[11px] font-mono text-cam-text-secondary break-all"
                    title={filePath}
                  >
                    {extractFilename(filePath)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "errors" && (
          <div className="divide-y divide-cam-border/20">
            {agentErrors.length === 0 ? (
              <p className="text-xs text-cam-text-muted p-4 text-center">
                No errors
              </p>
            ) : (
              agentErrors.map((event) => (
                <div key={event.id} className="px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-cam-error">
                      {event.tool || event.hookType}
                    </span>
                    <span className="text-[9px] text-cam-text-muted font-mono">
                      {formatTimestamp(event.timestamp)}
                    </span>
                  </div>
                  {event.error && (
                    <p className="text-[10px] text-cam-error/80 mt-0.5 break-all">
                      {event.error}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "messages" && (
          <div className="divide-y divide-cam-border/20">
            {agentMessages.length === 0 ? (
              <p className="text-xs text-cam-text-muted p-4 text-center">
                No messages
              </p>
            ) : (
              agentMessages.map((event) => (
                <div key={event.id} className="px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-purple-400">
                      SendMessage
                    </span>
                    <span className="text-[9px] text-cam-text-muted font-mono">
                      {formatTimestamp(event.timestamp)}
                    </span>
                  </div>
                  {event.input && (
                    <p className="text-[10px] text-cam-text-secondary mt-0.5 break-words whitespace-pre-wrap">
                      {event.input}
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
