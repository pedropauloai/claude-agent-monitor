import { useEffect, useState } from "react";
import { useSessionStore } from "../../../stores/session-store";
import { formatElapsedTime, formatNumber } from "../../../lib/formatters";

export function ModernStatsBar() {
  const { session, agents, events } = useSessionStore();
  const [elapsed, setElapsed] = useState("00m 00s");

  useEffect(() => {
    if (!session?.startedAt) return;

    const update = () =>
      setElapsed(formatElapsedTime(session.startedAt, session.endedAt));
    update();

    if (!session.endedAt) {
      const interval = setInterval(update, 1000);
      return () => clearInterval(interval);
    }
  }, [session?.startedAt, session?.endedAt]);

  const activeAgents = agents.filter((a) => a.status === "active").length;
  const totalErrors = agents.reduce((sum, a) => sum + a.errorCount, 0);
  const totalToolCalls = agents.reduce((sum, a) => sum + a.toolCallCount, 0);
  const fileEvents = events.filter((e) => e.category === "file_change").length;

  const isSessionEnded = session?.status === 'completed' || session?.status === 'error';

  const stats = [
    ...(isSessionEnded ? [{
      label: session?.status === 'error' ? "Ended (error)" : "Ended",
      value: session?.endedAt
        ? new Date(session.endedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : '--:--',
      accent: false,
      isEnded: true,
    }] : []),
    { label: "Session Duration", value: elapsed, accent: false, isEnded: false },
    {
      label: "Agents",
      value: `${activeAgents}/${agents.length}`,
      accent: activeAgents > 0,
      isEnded: false,
    },
    { label: "Tool Calls", value: formatNumber(totalToolCalls), accent: false, isEnded: false },
    {
      label: "Events",
      value: formatNumber(session?.eventCount ?? 0),
      accent: false,
      isEnded: false,
    },
    { label: "Files", value: formatNumber(fileEvents), accent: false, isEnded: false },
    { label: "Errors", value: String(totalErrors), accent: totalErrors > 0, isEnded: false },
  ];

  return (
    <div className="h-10 flex items-center gap-0 px-4 border-b border-cam-border/30 bg-cam-surface/40 shrink-0">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={`flex items-center gap-2 ${i > 0 ? "border-l border-cam-border/30 pl-4 ml-4" : ""}`}
        >
          <span className="text-[10px] uppercase tracking-wider text-cam-text-muted font-medium">
            {stat.label}
          </span>
          <span
            className={`text-sm font-mono font-semibold ${
              stat.isEnded
                ? "text-amber-400"
                : stat.label === "Errors" && totalErrors > 0
                  ? "text-cam-error"
                  : stat.accent
                    ? "text-cam-success"
                    : "text-cam-text"
            }`}
          >
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}
