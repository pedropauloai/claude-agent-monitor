import { useEffect, useRef } from "react";
import { SSEClient } from "../lib/sse";
import { useSessionStore } from "../stores/session-store";
import { useProjectStore } from "../stores/project-store";
import { useNotificationStore } from "../stores/notification-store";
import type { AgentEvent, Agent } from "@cam/shared";

export function useSSE(sessionId?: string) {
  const clientRef = useRef<SSEClient | null>(null);
  const projectId = useSessionStore((s) => s.projectId);
  const {
    addEvent,
    addAgent,
    updateAgent,
    setConnected,
    setConnectionStatus,
    setLastHeartbeat,
  } = useSessionStore();
  const { updateTask, updateActiveProject, updateActiveSprint } =
    useProjectStore();

  useEffect(() => {
    if (!sessionId) return;

    const client = new SSEClient({
      url: "/api/stream",
      sessionId,
      projectId: projectId ?? undefined,
      onConnect: () => {
        setConnected(true);
        setConnectionStatus("connected");
      },
      onDisconnect: () => {
        setConnected(false);
        setConnectionStatus("reconnecting");
      },
      onEvent: (data: AgentEvent) => {
        addEvent(data);
        if (data.agentId) {
          addAgent({
            id: data.agentId,
            sessionId: data.sessionId,
            name: data.agentId,
            type: "agent",
            status: "active",
            firstSeenAt: data.timestamp,
            lastActivityAt: data.timestamp,
            toolCallCount: 0,
            errorCount: 0,
          });
        }
      },
      onAgentStatus: (data: { agent: string; status: Agent["status"] }) => {
        updateAgent(data.agent, { status: data.status });
        if (data.status === "shutdown" || data.status === "completed") {
          useNotificationStore.getState().addToast({
            type: "info",
            title: `Agente ${data.agent} finalizou`,
            duration: 4000,
          });
        }
      },
      onSessionStatus: (data: { session: string; status: string }) => {
        if (data.status === "completed" || data.status === "error") {
          const currentSession = useSessionStore.getState().session;
          if (
            currentSession &&
            (currentSession.id === data.session || !data.session)
          ) {
            useSessionStore.getState().setSession({
              ...currentSession,
              status: data.status as "completed" | "error",
              endedAt: new Date().toISOString(),
            });
            useNotificationStore.getState().addToast({
              type: data.status === "completed" ? "info" : "error",
              title:
                data.status === "completed"
                  ? "Sessao encerrada"
                  : "Sessao encerrada com erro",
              duration: 5000,
            });
          }
        } else if (data.status === "active") {
          useNotificationStore.getState().addToast({
            type: "success",
            title: "Nova sessao iniciada",
            duration: 5000,
          });
        }
      },
      onTaskStatusChanged: (data: {
        taskId: string;
        newStatus: string;
        agent?: string;
      }) => {
        updateTask(data.taskId, { status: data.newStatus as any });
      },
      onTaskAssigned: (data: { taskId: string; agent: string }) => {
        updateTask(data.taskId, { assignedAgent: data.agent });
      },
      onSprintProgress: (data: {
        sprintId: string;
        completedTasks: number;
        totalTasks: number;
        percent: number;
      }) => {
        updateActiveSprint({
          completedTasks: data.completedTasks,
          totalTasks: data.totalTasks,
        });
      },
      onProjectProgress: (data: {
        projectId: string;
        completedTasks: number;
        totalTasks: number;
        percent: number;
      }) => {
        updateActiveProject({
          completedTasks: data.completedTasks,
          totalTasks: data.totalTasks,
        });
      },
      onTaskBlocked: (data: {
        taskId: string;
        blockedBy: string[];
        reason: string;
      }) => {
        updateTask(data.taskId, {
          status: "blocked" as any,
          blockedBy: data.blockedBy,
        });
      },
      onTaskUnblocked: (data: { taskId: string; unblockedBy: string }) => {
        updateTask(data.taskId, { status: "pending" as any, blockedBy: [] });
      },
      onCorrelationMatch: () => {
        // Correlation matches are informational - the actual task update
        // comes via task_status_changed. Could be used for UI indicators.
      },
      onAgentCreated: (data: {
        agent: string;
        sessionId: string;
        name: string;
        type: string;
        status: string;
        timestamp: string;
      }) => {
        const agentName = data.name || data.agent;
        addAgent({
          id: data.agent,
          sessionId: data.sessionId,
          name: agentName,
          type: data.type || "agent",
          status: (data.status as Agent["status"]) || "active",
          firstSeenAt: data.timestamp,
          lastActivityAt: data.timestamp,
          toolCallCount: 0,
          errorCount: 0,
        });
        useNotificationStore.getState().addToast({
          type: "success",
          title: `Agente ${agentName} entrou`,
          message: data.type ? `Tipo: ${data.type}` : undefined,
          duration: 4000,
        });
      },
      onTeamCreated: () => {
        // Team created - could show notification in the future
      },
      onHeartbeat: (data: { timestamp: string }) => {
        setLastHeartbeat(data.timestamp);
      },
    });

    client.connect();
    clientRef.current = client;

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [
    sessionId,
    projectId,
    addEvent,
    addAgent,
    updateAgent,
    setConnected,
    setConnectionStatus,
    setLastHeartbeat,
    updateTask,
    updateActiveProject,
    updateActiveSprint,
  ]);

  return clientRef.current;
}
